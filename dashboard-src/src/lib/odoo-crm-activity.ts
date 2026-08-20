import { supabase } from "./supabase";

export type CreateOdooCrmActivityInput = {
  requestId: string;
  callId: string;
  activityTypeId: string;
};

export type CreateOdooCrmActivityResult = {
  success: boolean;
  status: "sent" | "pending_approval" | "failed" | "blocked";
  activityId: number | null;
  errorCode: string | null;
};

export async function createOdooCrmActivity(
  input: CreateOdooCrmActivityInput,
): Promise<CreateOdooCrmActivityResult> {
  const { data, error } = await supabase.rpc("create_odoo_pending_action", {
    p_entity_type: "crm_lead",
    p_action_type: "create",
    p_odoo_model: "mail.activity",
    p_odoo_method: "create",
    p_entity_id: input.callId,
    p_payload_json: {
      request_id: input.requestId,
      call_id: input.callId,
      activity_type_id: Number(input.activityTypeId),
    },
    p_validation_result: null,
  });

  if (error) {
    console.error("[createOdooCrmActivity] RPC error:", error.message, error);
    throw new Error(`Failed to queue Odoo CRM activity: ${error.message}`);
  }

  console.log("[createOdooCrmActivity] Pending action created:", data);

  return {
    success: true,
    status: "pending_approval",
    activityId: null,
    errorCode: null,
  };
}
