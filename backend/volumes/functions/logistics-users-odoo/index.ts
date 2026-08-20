import { corsHeaders, fetchOdooByIds, fetchOdooBatches, fetchOdooFieldNames, jsonResponse, normalizeEmail, referenceId, referenceName, requireOdooSyncAccess, supabaseAdmin, toRecordStatus } from "../_shared/odoo.ts";
const LOGISTICS_KEYWORDS = [
  "logistics",
  "warehouse",
  "delivery",
  "driver",
  "dispatch",
  "fleet",
  "shipping",
  "transport",
  "storekeeper",
  "stock",
  "fulfillment",
  "مخزن",
  "مخازن",
  "مستودع",
  "سائق",
  "توصيل",
  "مندوب",
  "شحن",
  "نقل",
  "لوجست",
  "مستلم",
  "امناء مخازن",
  "امين مخزن"
];
const WAREHOUSE_DEPARTMENT_KEYWORDS = [
  "warehouse",
  "مخزن",
  "مخازن",
  "مستودع"
];
const LOGISTICS_DEPARTMENT_KEYWORDS = [
  "logistics",
  "لوجست"
];
const OPERATIONAL_ROLE_KEYWORDS = [
  "warehouse",
  "driver",
  "delivery",
  "dispatch",
  "fleet",
  "shipping",
  "transport",
  "storekeeper",
  "stock",
  "fulfillment",
  "سائق",
  "توصيل",
  "مندوب",
  "شحن",
  "نقل",
  "امين مخزن",
  "مستلم"
];
function normalizeMatchValue(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[&/,_-]+/g, " ").replace(/\s+/g, " ");
}
function hasLogisticsKeyword(...values) {
  const haystack = values.map((value)=>normalizeMatchValue(value)).filter(Boolean).join(" ");
  if (!haystack) {
    return false;
  }
  return LOGISTICS_KEYWORDS.some((keyword)=>haystack.includes(keyword));
}
function hasAnyKeyword(value, keywords) {
  return keywords.some((keyword)=>value.includes(keyword));
}
function toNullableDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}
function isMissingDepartmentsTableError(message) {
  const normalized = message.toLowerCase();
  return normalized.includes("logistics_departments") && (normalized.includes("does not exist") || normalized.includes("schema cache") || normalized.includes("relation"));
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const authResponse = await requireOdooSyncAccess(req);
  if (authResponse) return authResponse;
  try {
    const employeeFieldNames = await fetchOdooFieldNames("hr.employee");
    const requestedEmployeeFields = [
      "id",
      "name",
      "job_title",
      "work_email",
      "work_phone",
      "mobile_phone",
      "barcode",
      "work_location",
      "active",
      "user_id",
      "department_id",
      "parent_id",
      "first_contract_date",
      "activity_state",
      "activity_type_id",
      "activity_date_deadline",
      "company_id",
      "create_date",
      "write_date"
    ];
    const employeeFields = requestedEmployeeFields.filter((field)=>employeeFieldNames.has(field));
    const employees = await fetchOdooBatches({
      model: "hr.employee",
      fields: employeeFields,
      domain: [],
      batchSize: 500,
      order: "name asc"
    });
    if (employees.length === 0) {
      return jsonResponse({
        success: true,
        count: 0,
        message: "No logistics users to sync"
      });
    }
    const { data: profiles, error: profilesError } = await supabaseAdmin.from("profiles").select("id, email, full_name");
    if (profilesError) {
      throw profilesError;
    }
    const departmentIds = Array.from(new Set(employees.map((employee)=>Number(referenceId(employee.department_id))).filter(Number.isFinite)));
    const departmentFieldNames = await fetchOdooFieldNames("hr.department");
    const requestedDepartmentFields = [
      "id",
      "name",
      "complete_name",
      "parent_id",
      "manager_id",
      "company_id",
      "active"
    ];
    const departmentFields = requestedDepartmentFields.filter((field)=>departmentFieldNames.has(field));
    const departments = await fetchOdooByIds({
      model: "hr.department",
      ids: departmentIds,
      fields: departmentFields
    });
    const syncTime = new Date().toISOString();
    if (departments.length > 0) {
      const departmentUpsertData = departments.map((department)=>({
          external_department_id: String(department.id),
          department_name: String(department.name ?? "").trim() || `Department ${department.id}`,
          complete_name: String(department.complete_name ?? "").trim() || null,
          parent_department_ref: referenceName(department.parent_id),
          manager_external_employee_id: referenceId(department.manager_id),
          manager_name: referenceName(department.manager_id),
          company_name: referenceName(department.company_id),
          status: toRecordStatus(department.active),
          raw_payload: department,
          last_sync_at: syncTime,
          updated_at: syncTime
        }));
      const { error: departmentsUpsertError } = await supabaseAdmin.from("logistics_departments").upsert(departmentUpsertData, {
        onConflict: "external_department_id"
      });
      if (departmentsUpsertError) {
        if (!isMissingDepartmentsTableError(departmentsUpsertError.message)) {
          throw departmentsUpsertError;
        }
      }
    }
    const departmentsById = new Map(departments.map((department)=>[
        department.id,
        department
      ]));
    const profilesByEmail = new Map();
    const profilesByName = new Map();
    for (const profile of profiles ?? []){
      const emailKey = normalizeEmail(profile.email);
      if (emailKey) {
        profilesByEmail.set(emailKey, {
          id: profile.id,
          full_name: profile.full_name ?? null
        });
      }
      const nameKey = String(profile.full_name ?? "").trim().toLowerCase();
      if (!nameKey) continue;
      const existing = profilesByName.get(nameKey) ?? [];
      existing.push({
        id: profile.id,
        email: profile.email ?? null
      });
      profilesByName.set(nameKey, existing);
    }
    const logisticsEmployees = employees.filter((employee)=>{
      const department = departmentsById.get(Number(referenceId(employee.department_id)));
      const departmentText = normalizeMatchValue([
        referenceName(employee.department_id),
        department?.complete_name
      ].filter(Boolean).join(" "));
      const titleText = normalizeMatchValue(employee.job_title);
      const roleText = normalizeMatchValue([
        employee.job_title,
        employee.work_location
      ].filter(Boolean).join(" "));
      if (hasAnyKeyword(departmentText, WAREHOUSE_DEPARTMENT_KEYWORDS)) {
        return true;
      }
      if (hasAnyKeyword(departmentText, LOGISTICS_DEPARTMENT_KEYWORDS)) {
        return hasAnyKeyword(titleText, OPERATIONAL_ROLE_KEYWORDS);
      }
      return hasLogisticsKeyword(employee.job_title, employee.work_location);
    });
    const upsertData = logisticsEmployees.map((employee)=>{
      const emailKey = normalizeEmail(employee.work_email);
      const employeeName = String(employee.name ?? "").trim() || `Employee ${employee.id}`;
      const nameMatches = profilesByName.get(employeeName.toLowerCase()) ?? [];
      const linkedProfileId = profilesByEmail.get(emailKey)?.id ?? (nameMatches.length === 1 ? nameMatches[0].id : null);
      return {
        external_employee_id: String(employee.id),
        external_user_id: referenceId(employee.user_id),
        linked_profile_id: linkedProfileId,
        employee_name: employeeName,
        job_title: String(employee.job_title ?? "").trim() || null,
        work_email: emailKey || null,
        work_phone: String(employee.work_phone ?? "").trim() || null,
        mobile_phone: String(employee.mobile_phone ?? "").trim() || null,
        employee_code: String(employee.barcode ?? "").trim() || null,
        department_external_id: referenceId(employee.department_id),
        department_name: referenceName(employee.department_id),
        manager_external_employee_id: referenceId(employee.parent_id),
        manager_name: referenceName(employee.parent_id),
        first_contract_date: toNullableDate(employee.first_contract_date),
        activity_state: String(employee.activity_state ?? "").trim() || null,
        activity_type_name: referenceName(employee.activity_type_id),
        next_activity_deadline: toNullableDate(employee.activity_date_deadline),
        company_name: referenceName(employee.company_id),
        work_location: String(employee.work_location ?? "").trim() || null,
        status: toRecordStatus(employee.active),
        raw_payload: employee,
        last_sync_at: syncTime,
        updated_at: syncTime
      };
    });
    const { error: upsertError } = await supabaseAdmin.from("logistics_users").upsert(upsertData, {
      onConflict: "external_employee_id"
    });
    if (upsertError) {
      throw upsertError;
    }
    if (upsertData.length > 0) {
      const syncedIds = upsertData.map((employee)=>employee.external_employee_id);
      const { data: existingRows, error: existingRowsError } = await supabaseAdmin.from("logistics_users").select("external_employee_id");
      if (existingRowsError) {
        throw existingRowsError;
      }
      const staleIds = (existingRows ?? []).map((row)=>String(row.external_employee_id ?? "").trim()).filter((externalEmployeeId)=>externalEmployeeId && !syncedIds.includes(externalEmployeeId));
      if (staleIds.length > 0) {
        const { error: deactivateError } = await supabaseAdmin.from("logistics_users").update({
          status: "inactive",
          updated_at: syncTime
        }).in("external_employee_id", staleIds).neq("status", "inactive");
        if (deactivateError) {
          throw deactivateError;
        }
      }
    }
    return jsonResponse({
      success: true,
      count: upsertData.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Log error to watermarks for monitoring
    await supabaseAdmin.from("logistics_sync_watermarks").upsert({
      entity_type: "users",
      last_error: message,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "entity_type"
    }).select().maybeSingle();
    return jsonResponse({
      success: false,
      error: message
    }, 500);
  }
});
