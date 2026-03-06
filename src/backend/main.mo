import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import List "mo:core/List";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Types
  type FarmRecord = {
    farmerName : Text;
    commodity : Text;
    grade : Text;
    adminArea : Text;
    latitude : Float;
    longitude : Float;
    createdAt : Int;
  };

  module FarmRecord {
    public func compareByFarmerName(record1 : FarmRecord, record2 : FarmRecord) : Order.Order {
      switch (Text.compare(record1.farmerName, record2.farmerName)) {
        case (#equal) { Text.compare(record1.commodity, record2.commodity) };
        case (order) { order };
      };
    };

    public func compareByCommodity(record1 : FarmRecord, record2 : FarmRecord) : Order.Order {
      Text.compare(record1.commodity, record2.commodity);
    };
  };

  type ScanEvent = {
    farmId : Text;
    userAgent : Text;
    timestamp : Int;
    deviceType : Text;
  };

  module ScanEvent {
    public func compareByTimestamp(event1 : ScanEvent, event2 : ScanEvent) : Order.Order {
      Int.compare(event1.timestamp, event2.timestamp);
    };
  };

  type ScanStats = {
    totalScans : Nat;
    scanEvents : [ScanEvent];
  };

  // Data Structures
  let farmRecords = Map.empty<Text, FarmRecord>();
  let scanStats = Map.empty<Text, List.List<ScanEvent>>();

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Farm Records Management
  public shared ({ caller }) func addFarmRecord(farmId : Text, record : FarmRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add farm records");
    };
    farmRecords.add(farmId, record);
  };

  public query ({ caller }) func getFarmRecord(farmId : Text) : async FarmRecord {
    switch (farmRecords.get(farmId)) {
      case (null) { Runtime.trap("Farm record not found") };
      case (?record) { record };
    };
  };

  public query ({ caller }) func getAllFarmRecords() : async [FarmRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all farm records");
    };
    farmRecords.values().toArray().sort(FarmRecord.compareByFarmerName);
  };

  // QR Scan Tracking
  public shared ({ caller }) func logScan(farmId : Text, userAgent : Text) : async () {
    let deviceType = getDeviceType(userAgent);
    let scanEvent : ScanEvent = {
      farmId;
      userAgent;
      timestamp = Time.now();
      deviceType;
    };

    let existingEvents = switch (scanStats.get(farmId)) {
      case (null) { List.empty<ScanEvent>() };
      case (?events) { events };
    };
    existingEvents.add(scanEvent);
    scanStats.add(farmId, existingEvents);
  };

  public query ({ caller }) func getFarmScanStats(farmId : Text) : async ScanStats {
    switch (scanStats.get(farmId)) {
      case (null) {
        {
          totalScans = 0;
          scanEvents = [];
        };
      };
      case (?events) {
        {
          totalScans = events.size();
          scanEvents = events.toArray();
        };
      };
    };
  };

  public query ({ caller }) func getAllScanStats() : async [ScanEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all scan stats");
    };
    let combinedIter = scanStats.values().flatMap(
      func(events) { events.values() }
    );
    combinedIter.toArray().sort(ScanEvent.compareByTimestamp);
  };

  // Helper Functions
  func getDeviceType(userAgent : Text) : Text {
    if (userAgent.contains(#text("iPhone"))) {
      "iPhone";
    } else if (userAgent.contains(#text("Android"))) {
      "Android";
    } else {
      "PC";
    };
  };
};
