const privateTypes = new Set([
  "calendar_event",
  "fieldwork_plan",
  "fieldwork_information",
  "fieldwork_interview",
]);

export function assertPublicDetail(detailId, detail) {
  if (/(?:^|\/)(?:calendar_|fieldwork_)/.test(detailId)) {
    throw new Error(`private reference detail is publicly exposed: ${detailId}`);
  }
  function checkEmbeddedRecords(value) {
    if (!value || typeof value !== "object") return;
    if (privateTypes.has(value.record_type)) {
      throw new Error(`private reference detail type is publicly exposed: ${detailId}`);
    }
    for (const key of ["detail_id", "entity_id"]) {
      if (typeof value[key] === "string" && /(?:^|\/)(?:calendar_|fieldwork_)/.test(value[key])) {
        throw new Error(`private reference detail ID is publicly exposed: ${detailId}`);
      }
    }
    for (const child of Object.values(value)) checkEmbeddedRecords(child);
  }
  checkEmbeddedRecords(detail);
  const text = JSON.stringify(detail);
  if (/出張計画\.xlsx|iwagei_michinoku_geino_calendar/i.test(text)) {
    throw new Error(`internal source workbook is publicly exposed: ${detailId}`);
  }
}
