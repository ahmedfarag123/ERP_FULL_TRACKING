// Page Type: D
// Purpose: Force first-login users to replace their temporary password before accessing the admin workspace
// Primary user action: Set a permanent password and return to the sign-in page
// Data source: Supabase Auth session and profiles onboarding state

import { useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

function PasswordField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <Label>
        {props.label} <span className="text-error-500">*</span>
      </Label>
      <div className="relative">
        <Input
          type={props.visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Enter your new password"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          required
        />
        <span
          onClick={props.onToggle}
          className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
        >
          {props.visible ? (
            <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
          ) : (
            <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
          )}
        </span>
      </div>
    </div>
  );
}

export default function ForcePasswordChange() {
  const navigate = useNavigate();
  const { authUser, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: rpcError } = await supabase.rpc("complete_forced_password_change");
      if (rpcError) {
        throw new Error(rpcError.message);
      }

      await signOut();
      navigate("/signin", {
        replace: true,
        state: {
          message: "Password updated. Sign in again with your new password.",
        },
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update the password right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Change Temporary Password | Sales Admin"
        description="Replace the temporary password before accessing the admin workspace."
      />
      <AuthLayout>
        <div className="flex flex-1 flex-col">
          <div className="flex w-full max-w-md flex-1 flex-col justify-center mx-auto">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
                  Change Temporary Password
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {authUser?.email
                    ? `You must set a permanent password for ${authUser.email} before continuing.`
                    : "You must set a permanent password before continuing."}
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                  {error}
                </div>
              ) : null}

              <form onSubmit={(event) => void handleSubmit(event)}>
                <div className="space-y-6">
                  <PasswordField
                    label="New Password"
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggle={() => setShowPassword((current) => !current)}
                  />
                  <PasswordField
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((current) => !current)}
                  />
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    After saving the new password, you will be signed out and asked to sign in
                    again.
                  </div>
                  <Button className="w-full" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Updating password..." : "Save New Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
