// Page Type: D — Form
// Purpose: Create a new system user with role and team assignment
// Primary user action: Fill and submit the creation form
// Data source: POST to admin/users

import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import UtilityPageLayout from "../../components/layout/UtilityPageLayout";
import { AdminPageFrame } from "../../components/admin/AdminPageElements";
import PageHeader from "../../components/ui/PageHeader";
import { createManagedUser, fetchDepartments, ROLE_ORDER, getRoleLabel } from "../../lib/access-control";
import { useCurrentAccess } from "../../hooks/useCurrentAccess";
import { supabase } from "../../lib/supabase";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: (typeof ROLE_ORDER)[number];
  departmentId: string;
  status: boolean;
  phone: string;
  avatarName: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function fieldClass(hasError: boolean) {
  return `h-11 w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 dark:text-white ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/40"
      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-700"
  }`;
}

function fileClass(hasError: boolean) {
  return `block w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-25 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-700 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-200 ${
    hasError ? "border-red-300 dark:border-red-500/40" : "border-gray-300 dark:border-gray-700"
  }`;
}

function Field(props: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {props.label}
      </span>
      {props.children}
      {props.error ? <span className="text-xs text-red-500">{props.error}</span> : null}
    </label>
  );
}

export default function UserCreatePage() {
  const navigate = useNavigate();
  const { hasPermission } = useCurrentAccess();
  const canEdit = hasPermission("users.invite");
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
  const [formState, setFormState] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "sales_agent",
    departmentId: "",
    status: true,
    phone: "",
    avatarName: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const rows = await fetchDepartments();
        setDepartments(rows.map((department) => ({
          id: department.id,
          name: department.name,
          isActive: department.isActive,
        })));
      } catch {
        setDepartments([]);
      }
    };

    void loadDepartments();
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!formState.fullName.trim()) nextErrors.fullName = "Name is required.";
    if (!formState.email.trim()) nextErrors.email = "Email is required.";
    if (!/\S+@\S+\.\S+/.test(formState.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!formState.password.trim()) nextErrors.password = "Password is required.";
    if (formState.password.trim().length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }
    if (formState.confirmPassword.trim() !== formState.password.trim()) {
      nextErrors.confirmPassword = "Passwords must match.";
    }
    if (!formState.departmentId) nextErrors.departmentId = "Select a team.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !validateForm()) return;

    setIsCreating(true);
    setError("");
    setNotice("");

    try {
      const result = await createManagedUser({
        email: formState.email.trim(),
        fullName: formState.fullName.trim(),
        role: formState.role,
        status: formState.status ? "active" : "inactive",
        departmentId: formState.departmentId,
        phone: formState.phone.trim() || undefined,
        initialPassword: formState.password.trim(),
        sendInvite: false,
      });

      setNotice(
        `User created for ${result.email}.`,
      );
      setPasswordNotice(formState.password.trim());
      navigate(`/admin/users/${result.userId}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <PageMeta title="Create New User | Sales Admin" description="Create a new system user." />

      <AdminPageFrame>
        <UtilityPageLayout
          header={
            <PageHeader
              variant="detail"
              backHref="/admin/users"
              backLabel="Back to Users"
              title="Create New User"
              subtitle="Provision a new system user with a temporary password, role, team assignment, and profile details."
            />
          }
          notices={
            <>
              {!canEdit ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Your account does not have permission to create users.
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                  {passwordNotice && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-emerald-800 font-medium">Temporary password:</span>
                      <code className="rounded-lg bg-emerald-100 px-3 py-1.5 font-mono text-base font-bold text-emerald-900 select-all">
                        {passwordNotice}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(passwordNotice)}
                        className="text-emerald-600 hover:text-emerald-800 text-xs underline"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-emerald-600">They must change this password after first sign-in.</p>
                </div>
              ) : null}
            </>
          }
        >
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="space-y-8">
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Account Info
                  </h2>
                </div>
                <div className="grid gap-4">
                  <Field label="Name" error={errors.fullName}>
                    <input
                      type="text"
                      autoComplete="name"
                      value={formState.fullName}
                      onChange={(event) => setField("fullName", event.target.value)}
                      className={fieldClass(Boolean(errors.fullName))}
                    />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      autoComplete="email"
                      value={formState.email}
                      onChange={(event) => setField("email", event.target.value)}
                      className={fieldClass(Boolean(errors.email))}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Temporary Password" error={errors.password}>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={formState.password}
                        onChange={(event) => setField("password", event.target.value)}
                        className={fieldClass(Boolean(errors.password))}
                      />
                    </Field>
                    <Field label="Confirm Temporary Password" error={errors.confirmPassword}>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={formState.confirmPassword}
                        onChange={(event) => setField("confirmPassword", event.target.value)}
                        className={fieldClass(Boolean(errors.confirmPassword))}
                      />
                    </Field>
                  </div>
                  
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Role & Access
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Role">
                    <select
                      value={formState.role}
                      onChange={(event) =>
                        setField("role", event.target.value as (typeof ROLE_ORDER)[number])
                      }
                      className={fieldClass(false)}
                    >
                      {ROLE_ORDER.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Team" error={errors.departmentId}>
                    <select
                      value={formState.departmentId}
                      onChange={(event) => setField("departmentId", event.target.value)}
                      className={fieldClass(Boolean(errors.departmentId))}
                    >
                      <option value="">اختر فريقا</option>
                      {departments
                        .filter((department) => department.isActive)
                        .map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">الحالة</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Toggle whether the account should be active immediately after creation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("status", !formState.status)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      formState.status ? "bg-brand-500" : "bg-gray-300 dark:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 transform rounded-full bg-white transition ${
                        formState.status ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Profile
                  </h2>
                </div>
                <div className="grid gap-4">
                  <Field label="Phone">
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={formState.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                      className={fieldClass(false)}
                    />
                  </Field>
                  <Field label="Avatar Upload (Optional)" error={errors.avatarName}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setField("avatarName", event.target.files?.[0]?.name ?? "")
                      }
                      className={fileClass(Boolean(errors.avatarName))}
                    />
                  </Field>
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => navigate("/admin/users")}
                  className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-brand-25 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canEdit || isCreating}
                  className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </form>
        </UtilityPageLayout>
      </AdminPageFrame>
    </>
  );
}
