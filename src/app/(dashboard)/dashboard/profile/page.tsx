"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Save,
  Check,
  Camera,
  Loader2,
  X,
} from "lucide-react";

// Matches the addresses table in schema.sql exactly — no postal_code column.
// (Nigerian addresses rarely use postcodes in practice; delivery is by street + city + state.)
type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
};

// Matches the profiles table — no delivery_preference column.
// Buyers choose delivery mode per-order at checkout (FR-BYR-024), so no
// "default preference" is needed here.
type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
};

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
].map((s) => ({ value: s, label: s }));

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    street: "",
    city: "",
    state: "",
    is_default: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url")
      .eq("id", user.id)
      .single();

    const profileData: Profile = {
      ...(prof as Omit<Profile, "email">),
      email: user.email || "",
    };

    setProfile(profileData);
    setFullName(profileData.full_name || "");
    setPhone(profileData.phone || "");

    const { data: addrs } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    setAddresses((addrs as unknown as Address[]) || []);
    setLoading(false);
  }

  async function uploadAvatar(file: File) {
    setAvatarError(null);

    // Client-side validation — matches the bucket constraints from
    // migration 008 (2MB, JPG/PNG/WebP only).
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop() || "jpg";
      // Stable path per user so each upload overwrites the previous
      // one (no orphaned files to clean up later).
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setAvatarError(uploadError.message);
        return;
      }

      // Append a cache-buster so the browser refreshes the image
      // immediately (Supabase Storage serves long cache headers).
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        setAvatarError(updateError.message);
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!profile?.avatar_url) return;
    if (!confirm("Remove your profile picture?")) return;
    setUploadingAvatar(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploadingAvatar(false);
      return;
    }
    // Delete every variant the user might have uploaded so changing
    // ext later doesn't leave a stale file.
    const { data: list } = await supabase.storage.from("avatars").list(user.id);
    if (list && list.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(list.map((f) => `${user.id}/${f.name}`));
    }
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
      })
      .eq("id", profile.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveAddress() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editingAddress) {
      await supabase
        .from("addresses")
        .update({ ...addressForm })
        .eq("id", editingAddress.id);
    } else {
      await supabase
        .from("addresses")
        .insert({ ...addressForm, user_id: user.id });
    }

    await fetchProfile();
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressForm({
      label: "",
      street: "",
      city: "",
      state: "",
      is_default: false,
    });
  }

  async function deleteAddress(addressId: string) {
    const supabase = createClient();
    await supabase.from("addresses").delete().eq("id", addressId);
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
  }

  async function setDefaultAddress(addressId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", addressId);

    setAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === addressId }))
    );
  }

  function openEditAddress(addr: Address) {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      is_default: addr.is_default,
    });
    setShowAddressForm(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-mist border-t-royal" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Profile
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Manage your account details and preferences
        </p>
      </div>

      {/* Avatar upload + email row.
          Tap the avatar (or the "Change photo" link below it on mobile)
          to pick a new image. Click X to remove the current one. */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <div className="relative shrink-0 self-center sm:self-auto">
            <label
              htmlFor="avatar-upload"
              className="relative block cursor-pointer group"
              aria-label="Upload profile picture"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name || "User"}
                size="lg"
              />
              {/* Hover/tap overlay */}
              <div className="absolute inset-0 rounded-full bg-midnight/60 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-6 w-6 text-white" aria-hidden="true" />
                )}
              </div>
              {/* Mobile-visible camera badge so tap target is obvious */}
              <span
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-royal text-white flex items-center justify-center shadow-md border-2 border-white sm:hidden"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadingAvatar}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                // Reset so picking the SAME file twice still fires onChange
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="font-semibold text-midnight">
              {profile?.full_name || "Your profile"}
            </p>
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-slate-light mt-0.5">
              <Mail size={13} aria-hidden="true" />
              {profile?.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium text-royal hover:text-royal-dark min-h-[44px] sm:min-h-0 px-2"
              >
                <Camera size={14} aria-hidden="true" />
                {profile?.avatar_url ? "Change photo" : "Upload photo"}
              </label>
              {profile?.avatar_url && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-error hover:text-red-700 min-h-[44px] sm:min-h-0 px-2 disabled:opacity-50"
                >
                  <X size={14} aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>
            {avatarError && (
              <p className="mt-1 text-xs text-error" role="alert">
                {avatarError}
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-lighter">
              JPG, PNG or WebP · Max 2 MB · Square images work best
            </p>
          </div>
        </div>
      </Card>

      {/* User info form */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={18} className="text-royal" />
            Personal Info
          </CardTitle>
          <CardDescription>Update your name and contact details</CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Input
            id="full-name"
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User size={16} />}
          />

          <Input
            id="email"
            label="Email Address"
            value={profile?.email || ""}
            disabled
            icon={<Mail size={16} />}
          />

          <Input
            id="phone"
            label="Phone Number"
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone size={16} />}
          />

          <Button
            variant="primary"
            size="md"
            onClick={saveProfile}
            loading={saving}
            disabled={saving}
          >
            {saved ? (
              <>
                <Check size={16} className="mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Address book */}
      <Card padding="md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-royal" />
                Address Book
              </CardTitle>
              <CardDescription>Manage your delivery addresses</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingAddress(null);
                setAddressForm({
                  label: "",
                  street: "",
                  city: "",
                  state: "",
                  is_default: false,
                });
                setShowAddressForm(true);
              }}
            >
              <Plus size={15} className="mr-1.5" />
              Add Address
            </Button>
          </div>
        </CardHeader>

        {/* Address list */}
        <div className="space-y-3">
          {addresses.length === 0 && !showAddressForm && (
            <p className="py-6 text-center text-sm text-slate-light">
              No addresses saved yet
            </p>
          )}

          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-[--radius-md] border p-4 transition-colors ${
                addr.is_default
                  ? "border-royal/30 bg-royal/5"
                  : "border-mist-dark bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-midnight">{addr.label}</p>
                    {addr.is_default && (
                      <Badge variant="royal">Default</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-light">
                    {addr.street}, {addr.city}, {addr.state}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!addr.is_default && (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="rounded-md px-2 py-1 text-xs text-royal hover:bg-royal/10 transition-colors"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() => openEditAddress(addr)}
                    className="rounded-md p-1.5 text-slate-lighter hover:text-royal hover:bg-royal/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    className="rounded-md p-1.5 text-slate-lighter hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add / edit address form */}
          {showAddressForm && (
            <div className="rounded-[--radius-md] border border-royal/20 bg-royal/5 p-4 space-y-3">
              <p className="font-semibold text-midnight">
                {editingAddress ? "Edit Address" : "New Address"}
              </p>

              <Input
                label="Label"
                placeholder="e.g. Home, Office"
                value={addressForm.label}
                onChange={(e) =>
                  setAddressForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <Input
                label="Street Address"
                placeholder="123 Example Street"
                value={addressForm.street}
                onChange={(e) =>
                  setAddressForm((f) => ({ ...f, street: e.target.value }))
                }
                icon={<MapPin size={15} />}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  placeholder="Lagos"
                  value={addressForm.city}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
                <Select
                  label="State"
                  options={NIGERIAN_STATES}
                  placeholder="Select state"
                  value={addressForm.state}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, state: e.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) =>
                    setAddressForm((f) => ({
                      ...f,
                      is_default: e.target.checked,
                    }))
                  }
                  className="rounded border-mist-dark accent-royal"
                />
                <span className="text-sm text-slate">Set as default address</span>
              </label>

              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={saveAddress}>
                  <Save size={14} className="mr-1.5" />
                  {editingAddress ? "Update" : "Save"} Address
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Delivery preferences removed — buyer picks delivery mode per-order at
          checkout (FR-BYR-024); the previous card wrote to a column that
          doesn't exist on the profiles table. */}
    </div>
  );
}
