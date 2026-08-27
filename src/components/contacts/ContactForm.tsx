"use client";

import { type ChangeEvent, useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Contact,
  type ContactInput,
  type FormState,
  type AddressInput,
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
  const photoReadId = useRef(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const displayedPhotoError = photoError ?? state.fieldErrors?.photo_data_url;
  const [addresses, setAddresses] = useState<AddressInput[]>(
    state.values?.addresses ?? contact?.addresses ?? [],
  );

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const readId = ++photoReadId.current;
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
      if (photoReadId.current !== readId) return;
      setPhotoDataUrl(String(reader.result));
      setPhotoError(undefined);
    });
    reader.addEventListener("error", () => {
      if (photoReadId.current !== readId) return;
      setPhotoError("The photo could not be read. Try another file.");
    });
    reader.readAsDataURL(file);
  }

  function valueFor(name: Exclude<keyof ContactInput, "addresses">): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  function updateAddress(index: number, patch: Partial<AddressInput>) {
    setAddresses((current) =>
      current.map((address, addressIndex) =>
        addressIndex === index ? { ...address, ...patch } : address,
      ),
    );
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
              ref={photoInputRef}
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
                  photoReadId.current += 1;
                  setPhotoDataUrl("");
                  setPhotoError(undefined);
                  if (photoInputRef.current) photoInputRef.current.value = "";
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

      <fieldset className="space-y-4">
        <legend className="sr-only">Addresses</legend>
        <div className="flex items-end justify-between gap-4 border-b border-hairline pb-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">Addresses</h2>
            <p className="text-[13px] text-muted-foreground">
              Add any number of Home, Work, or Other addresses.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setAddresses((current) => [
                ...current,
                {
                  type: "Home",
                  street_address: "",
                  city: null,
                  state: null,
                  postal_code: null,
                  country: null,
                },
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add address
          </Button>
        </div>
        <input type="hidden" name="addresses" value={JSON.stringify(addresses)} />
        {addresses.length ? (
          <div className="space-y-4">
            {addresses.map((address, index) => (
              <div key={index} className="rounded-lg border border-border bg-card/50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-foreground">
                    Address {index + 1}
                    <select
                      aria-label={`Address ${index + 1} type`}
                      value={address.type}
                      onChange={(event) =>
                        updateAddress(index, { type: event.target.value as AddressInput["type"] })
                      }
                      className="ml-3 rounded-md border border-border bg-input px-2 py-1.5 text-sm"
                    >
                      <option>Home</option>
                      <option>Work</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove address ${index + 1}`}
                    onClick={() =>
                      setAddresses((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["street_address", "Street address", 300],
                    ["city", "City", 120],
                    ["state", "State / region", 120],
                    ["postal_code", "Postal code", 20],
                    ["country", "Country", 120],
                  ] as const).map(([name, label, maxLength]) => (
                    <label key={name} className={name === "street_address" ? "sm:col-span-2" : ""}>
                      <span className="mb-1.5 block text-[13px] font-medium text-foreground">
                        {label}{name === "street_address" ? " *" : ""}
                      </span>
                      <input
                        aria-label={`Address ${index + 1} ${label}`}
                        required={name === "street_address"}
                        maxLength={maxLength}
                        value={address[name] ?? ""}
                        onChange={(event) => updateAddress(index, { [name]: event.target.value || null })}
                        className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
            No addresses added.
          </p>
        )}
        {state.fieldErrors?.addresses ? (
          <p role="alert" className="text-sm text-destructive">{state.fieldErrors.addresses}</p>
        ) : null}
      </fieldset>

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
