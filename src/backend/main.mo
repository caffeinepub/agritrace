import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Principal "mo:core/Principal";


import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  // ── Types ──────────────────────────────────────────────────────────────────

  // v1: original shape (no optional fields)
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

  // v2: added optional traceability fields (no sequenceNumber/areaCode)
  type FarmRecord_v2 = {
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

  // v3 (current): added sequenceNumber and areaCode
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
    sequenceNumber : Nat;
    areaCode : ?Text;
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

  // ── Stable state ─────────────────────────────────────────────────────────────────

  // v1 storage kept read-only for migration
  let farmRecords : Map.Map<Text, FarmRecord_v1> = Map.empty<Text, FarmRecord_v1>();

  // v2 storage kept read-only for migration (previous deployment wrote here)
  let farmRecords_v2 : Map.Map<Text, FarmRecord_v2> = Map.empty<Text, FarmRecord_v2>();

  // v3 storage: current shape with sequenceNumber + areaCode
  let farmRecords_v3 : Map.Map<Text, FarmRecord> = Map.empty<Text, FarmRecord>();

  let scanStats = Map.empty<Text, List.List<ScanEvent>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var qrLogoUrl : Text = "";
  var farmSequenceCounter : Nat = 0;

  // ── Authorization ────────────────────────────────────────────────────────────────
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ── Migration: copy older records into v3 on upgrade ────────────────────────
  system func postupgrade() {
    // Migrate v1 → v3
    for ((k, v) in farmRecords.entries()) {
      if (farmRecords_v3.get(k) == null) {
        farmSequenceCounter += 1;
        farmRecords_v3.add(k, {
          farmerName      = v.farmerName;
          corporateName   = v.corporateName;
          phoneNumber     = v.phoneNumber;
          commodity       = v.commodity;
          grade           = v.grade;
          adminArea       = v.adminArea;
          latitude        = v.latitude;
          longitude       = v.longitude;
          createdAt       = v.createdAt;
          varieties       = null;
          farmSize        = null;
          coffeeTreeCount = null;
          shadeTreePct    = null;
          sequenceNumber  = farmSequenceCounter;
          areaCode        = null;
        });
      };
    };
    // Migrate v2 → v3
    for ((k, v) in farmRecords_v2.entries()) {
      if (farmRecords_v3.get(k) == null) {
        farmSequenceCounter += 1;
        farmRecords_v3.add(k, {
          farmerName      = v.farmerName;
          corporateName   = v.corporateName;
          phoneNumber     = v.phoneNumber;
          commodity       = v.commodity;
          grade           = v.grade;
          adminArea       = v.adminArea;
          latitude        = v.latitude;
          longitude       = v.longitude;
          createdAt       = v.createdAt;
          varieties       = v.varieties;
          farmSize        = v.farmSize;
          coffeeTreeCount = v.coffeeTreeCount;
          shadeTreePct    = v.shadeTreePct;
          sequenceNumber  = farmSequenceCounter;
          areaCode        = null;
        });
      };
    };
  };

  // ── User Profile Management ────────────────────────────────────────────────────
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

  // ── Farm Records ───────────────────────────────────────────────────────────────────
  // Returns the sequence number assigned to the new record
  public shared ({ caller }) func addFarmRecord(farmId : Text, record : FarmRecord) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add farm records");
    };
    farmSequenceCounter += 1;
    let seq = farmSequenceCounter;
    farmRecords_v3.add(farmId, {
      farmerName      = record.farmerName;
      corporateName   = record.corporateName;
      phoneNumber     = record.phoneNumber;
      commodity       = record.commodity;
      grade           = record.grade;
      adminArea       = record.adminArea;
      latitude        = record.latitude;
      longitude       = record.longitude;
      createdAt       = record.createdAt;
      varieties       = record.varieties;
      farmSize        = record.farmSize;
      coffeeTreeCount = record.coffeeTreeCount;
      shadeTreePct    = record.shadeTreePct;
      sequenceNumber  = seq;
      areaCode        = null;
    });
    seq
  };

  public query func getFarmRecord(farmId : Text) : async FarmRecord {
    switch (farmRecords_v3.get(farmId)) {
      case (?record) { record };
      case (null) {
        // Fall back to v2
        switch (farmRecords_v2.get(farmId)) {
          case (?v) {{
            farmerName      = v.farmerName;
            corporateName   = v.corporateName;
            phoneNumber     = v.phoneNumber;
            commodity       = v.commodity;
            grade           = v.grade;
            adminArea       = v.adminArea;
            latitude        = v.latitude;
            longitude       = v.longitude;
            createdAt       = v.createdAt;
            varieties       = v.varieties;
            farmSize        = v.farmSize;
            coffeeTreeCount = v.coffeeTreeCount;
            shadeTreePct    = v.shadeTreePct;
            sequenceNumber  = 0;
            areaCode        = null;
          }};
          case (null) {
            // Fall back to v1
            switch (farmRecords.get(farmId)) {
              case (null) { Runtime.trap("Farm record not found") };
              case (?v) {{
                farmerName      = v.farmerName;
                corporateName   = v.corporateName;
                phoneNumber     = v.phoneNumber;
                commodity       = v.commodity;
                grade           = v.grade;
                adminArea       = v.adminArea;
                latitude        = v.latitude;
                longitude       = v.longitude;
                createdAt       = v.createdAt;
                varieties       = null;
                farmSize        = null;
                coffeeTreeCount = null;
                shadeTreePct    = null;
                sequenceNumber  = 0;
                areaCode        = null;
              }};
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getAllFarmRecords() : async [FarmRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all farm records");
    };
    farmRecords_v3.values().toArray().sort(FarmRecord.compareByFarmerName);
  };

  // Returns [(farmId, FarmRecord)] so admin can reference records by ID
  public query ({ caller }) func getAllFarmRecordsWithIds() : async [(Text, FarmRecord)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all farm records");
    };
    farmRecords_v3.entries().toArray();
  };

  // Admin sets the area code (alphabet prefix) for a registered farm
  public shared ({ caller }) func setFarmAreaCode(farmId : Text, code : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set area codes");
    };
    switch (farmRecords_v3.get(farmId)) {
      case (null) { Runtime.trap("Farm record not found") };
      case (?record) {
        farmRecords_v3.add(farmId, {
          farmerName      = record.farmerName;
          corporateName   = record.corporateName;
          phoneNumber     = record.phoneNumber;
          commodity       = record.commodity;
          grade           = record.grade;
          adminArea       = record.adminArea;
          latitude        = record.latitude;
          longitude       = record.longitude;
          createdAt       = record.createdAt;
          varieties       = record.varieties;
          farmSize        = record.farmSize;
          coffeeTreeCount = record.coffeeTreeCount;
          shadeTreePct    = record.shadeTreePct;
          sequenceNumber  = record.sequenceNumber;
          areaCode        = ?code;
        });
      };
    };
  };

  // ── QR Scan Tracking ───────────────────────────────────────────────────────────────
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

  // ── QR Logo ───────────────────────────────────────────────────────────────────────
  public query func getQrLogoUrl() : async Text {
    qrLogoUrl
  };

  public shared ({ caller }) func setQrLogoUrl(url : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set the QR logo");
    };
    qrLogoUrl := url;
  };

  // ── Helpers ────────────────────────────────────────────────────────────────────
  func getDeviceType(ua : Text) : Text {
    if      (ua.contains(#text "iPhone"))  { "iPhone"  }
    else if (ua.contains(#text "Android")) { "Android" }
    else                                    { "PC"      };
  };
};
