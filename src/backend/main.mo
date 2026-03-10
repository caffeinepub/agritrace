import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Principal "mo:core/Principal";


import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  // ── Types ──────────────────────────────────────────────────────────────────

  // FarmRecord_v1 kept here ONLY so the upgrade can read the old stable data
  // (previous deployment stored this under the name `farmRecords`).
  // Do NOT use FarmRecord_v1 in any new code.
  type FarmRecord_v1 = {
    farmerName : Text;
    corporateName : Text;
    phoneNumber : Text;
    commodity : Text;
    grade : Text;
    adminArea : Text;
    latitude : Float;
    longitude : Float;
    createdAt : Int;
  };

  // Current record type – new fields are optional so old v1 data can be
  // deserialized with null defaults during upgrade.
  type FarmRecord = {
    farmerName : Text;
    corporateName : Text;
    phoneNumber : Text;
    commodity : Text;
    grade : Text;
    adminArea : Text;
    latitude : Float;
    longitude : Float;
    createdAt : Int;
    varieties : ?Text;
    farmSize : ?Text;
    coffeeTreeCount : ?Text;
    shadeTreePct : ?Text;
  };

  module FarmRecord {
    public func compareByFarmerName(a : FarmRecord, b : FarmRecord) : Order.Order {
      switch (Text.compare(a.farmerName, b.farmerName)) {
        case (#equal) { Text.compare(a.commodity, b.commodity) };
        case (order) { order };
      };
    };
  };

  type ScanEvent = {
    farmId : Text;
    userAgent : Text;
    timestamp : Int;
    deviceType : Text;
  };

  module ScanEvent {
    public func compareByTimestamp(a : ScanEvent, b : ScanEvent) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  type ScanStats = {
    totalScans : Nat;
    scanEvents : [ScanEvent];
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    organization : Text;
  };

  // ── Stable state ───────────────────────────────────────────────────────────

  // `farmRecords` retains the OLD name so the runtime can read the previous
  // stable data (stored as FarmRecord_v1 nodes) and leave it in place.
  // We never write to this map after postupgrade.
  let farmRecords : Map.Map<Text, FarmRecord_v1> = Map.empty<Text, FarmRecord_v1>();

  // New storage for the current FarmRecord shape.
  let farmRecords_v2 : Map.Map<Text, FarmRecord> = Map.empty<Text, FarmRecord>();

  let scanStats = Map.empty<Text, List.List<ScanEvent>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var qrLogoUrl : Text = "";

  // ── Authorization ──────────────────────────────────────────────────────────
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ── Migration: copy v1 records into v2 on first upgrade ───────────────────
  system func postupgrade() {
    for ((k, v) in farmRecords.entries()) {
      // Only migrate if not already present in v2
      if (farmRecords_v2.get(k) == null) {
        farmRecords_v2.add(k, {
          farmerName    = v.farmerName;
          corporateName = v.corporateName;
          phoneNumber   = v.phoneNumber;
          commodity     = v.commodity;
          grade         = v.grade;
          adminArea     = v.adminArea;
          latitude      = v.latitude;
          longitude     = v.longitude;
          createdAt     = v.createdAt;
          varieties     = null;
          farmSize      = null;
          coffeeTreeCount = null;
          shadeTreePct  = null;
        });
      };
    };
  };

  // ── User Profile Management ────────────────────────────────────────────────
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ── Farm Records ───────────────────────────────────────────────────────────
  public shared ({ caller }) func addFarmRecord(farmId : Text, record : FarmRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add farm records");
    };
    farmRecords_v2.add(farmId, record);
  };

  public query func getFarmRecord(farmId : Text) : async FarmRecord {
    switch (farmRecords_v2.get(farmId)) {
      case (?record) { record };
      case (null) {
        // Fall back to v1 data migrated inline
        switch (farmRecords.get(farmId)) {
          case (null) { Runtime.trap("Farm record not found") };
          case (?v) {{
            farmerName    = v.farmerName;
            corporateName = v.corporateName;
            phoneNumber   = v.phoneNumber;
            commodity     = v.commodity;
            grade         = v.grade;
            adminArea     = v.adminArea;
            latitude      = v.latitude;
            longitude     = v.longitude;
            createdAt     = v.createdAt;
            varieties     = null;
            farmSize      = null;
            coffeeTreeCount = null;
            shadeTreePct  = null;
          }};
        };
      };
    };
  };

  public query ({ caller }) func getAllFarmRecords() : async [FarmRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all farm records");
    };
    farmRecords_v2.values().toArray().sort(FarmRecord.compareByFarmerName);
  };

  // ── QR Scan Tracking ───────────────────────────────────────────────────────
  public shared func logScan(farmId : Text, userAgent : Text) : async () {
    let deviceType = getDeviceType(userAgent);
    let scanEvent : ScanEvent = {
      farmId;
      userAgent;
      timestamp = Time.now();
      deviceType;
    };
    let existing = switch (scanStats.get(farmId)) {
      case (null)  { List.empty<ScanEvent>() };
      case (?evts) { evts };
    };
    existing.add(scanEvent);
    scanStats.add(farmId, existing);
  };

  public query func getFarmScanStats(farmId : Text) : async ScanStats {
    switch (scanStats.get(farmId)) {
      case (null)  {{ totalScans = 0; scanEvents = [] }};
      case (?evts) {{
        totalScans  = evts.size();
        scanEvents  = evts.toArray();
      }};
    };
  };

  public query ({ caller }) func getAllScanStats() : async [ScanEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all scan stats");
    };
    scanStats.values().flatMap(func(evts) { evts.values() })
      .toArray()
      .sort(ScanEvent.compareByTimestamp);
  };

  // ── QR Logo ───────────────────────────────────────────────────────────────
  public query func getQrLogoUrl() : async Text {
    qrLogoUrl
  };

  public shared ({ caller }) func setQrLogoUrl(url : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set the QR logo");
    };
    qrLogoUrl := url;
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  func getDeviceType(ua : Text) : Text {
    if      (ua.contains(#text "iPhone"))  { "iPhone"  }
    else if (ua.contains(#text "Android")) { "Android" }
    else                                    { "PC"      };
  };
};
