const privateTypes = new Set([
  "calendar_event",
  "fieldwork_plan",
  "fieldwork_information",
  "fieldwork_interview",
]);

export function assertPublicDetail(detailId, detail) {
  if (/^(?:events\/)?(?:calendar_|fieldwork_)/.test(detailId)) {
    throw new Error(`private reference detail is publicly exposed: ${detailId}`);
  }
  if (privateTypes.has(detail?.record_type)) {
    throw new Error(`private reference detail type is publicly exposed: ${detailId}`);
  }
  const text = JSON.stringify(detail);
  if (/出張計画\.xlsx|iwagei_michinoku_geino_calendar/i.test(text)) {
    throw new Error(`internal source workbook is publicly exposed: ${detailId}`);
  }
}
