"use client";

import { type ChangeEvent, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Contact,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const [photoDataUrl, setPhotoDataUrl] = useState(
    state.values?.photo_data_url ?? contact?.photo_data_url ?? "",
  );
  const [photoError, setPhotoError] = useState<string>();
  const displayedPhotoError = photoError ?? state.fieldErrors?.photo_data_url;

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be 2 MiB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setPhotoDataUrl(String(reader.result));
      setPhotoError(undefined);
    });
    reader.addEventListener("error", () => {
      setPhotoError("The photo could not be read. Try another file.");
    });
    reader.readAsDataURL(file);
  }

  function valueFor(name: keyof ContactInput): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="sr-only">Photo</legend>
        <div className="border-b border-hairline pb-2">
          <h2 className="font-display text-sm font-semibold text-foreground">Photo</h2>
          <p className="text-[13px] text-muted-foreground">
            Optional JPEG, PNG, or WebP image up to 2 MiB.
          </p>
        </div>
        <input type="hidden" name="photo_data_url" value={photoDataUrl} />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs text-muted-foreground">
            {photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
              <img src={photoDataUrl} alt="Photo preview" className="h-full w-full object-cover" />
            ) : (
              "No photo"
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" htmlFor="contact-photo">
              Contact photo
            </label>
            <input
              id="contact-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={choosePhoto}
              aria-describedby={displayedPhotoError ? "contact-photo-error" : undefined}
              aria-invalid={displayedPhotoError ? "true" : undefined}
              className="block max-w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            />
            {photoDataUrl ? (
              <button
                type="button"
                onClick={() => {
                  setPhotoDataUrl("");
                  setPhotoError(undefined);
                }}
                className="text-sm text-destructive hover:underline"
              >
                Remove photo
              </button>
            ) : null}
            {displayedPhotoError ? (
              <p id="contact-photo-error" role="alert" className="text-sm text-destructive">
                {displayedPhotoError}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                defaultValue={valueFor(field.name)}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
