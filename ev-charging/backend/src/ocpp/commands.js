/**
 * Outgoing OCPP commands from CSMS.
 *
 * These are implemented using OCPP CALL messages. Some deployments require the
 * `chargePointId` to be passed in the payload and the OCPP server will route the
 * command to the correct charger.
 */

async function remoteStartTransaction(ocpp, { chargePointId, idTag = "ADMIN", connectorId } = {}) {
  return ocpp.callForCharger(chargePointId, "RemoteStartTransaction", {
    idTag,
    ...(connectorId ? { connectorId: Number(connectorId) } : {}),
  });
}

async function remoteStopTransaction(ocpp, { chargePointId, transactionId } = {}) {
  return ocpp.callForCharger(chargePointId, "RemoteStopTransaction", {
    transactionId: Number(transactionId),
  });
}

async function reset(ocpp, { chargePointId, type = "Soft" } = {}) {
  return ocpp.callForCharger(chargePointId, "Reset", { type });
}

async function getStatus(ocpp, { chargePointId } = {}) {
  // Not part of core OCPP 1.6; depends on your OCPP server. We keep a generic hook.
  return ocpp.callForCharger(chargePointId, "GetStatus", {});
}

module.exports = {
  remoteStartTransaction,
  remoteStopTransaction,
  reset,
  getStatus,
};
