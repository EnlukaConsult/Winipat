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
  Truck,
  Building2,
} from "lucide-react";

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  delivery_preference: string | null;
};

const DELIVERY_PREFS = [
  { value: "door_to_door", label: "Door-to-Door Delivery" },
  { value: "pickup_office", label: "Pickup at Office" },
];

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
  const [deliveryPref, setDeliveryPref] = useState("door_to_door");

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    street: "",
    city: "",
    state: "",
    postal_code: "",
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
      .select("id, full_name, phone, avatar_url, delivery_preference")
      .eq("id", user.id)
      .single();

    const profileData: Profile = {
      ...(prof as Omit<Profile, "email">),
      email: user.email || "",
    };

    setProfile(profileData);
    setFullName(profileData.full_name || "");
    setPhone(profileData.phone || "");
    setDeliveryPref(profileData.delivery_preference || "door_to_door");

    const { data: addrs } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    setAddresses((addrs as unknown as Address[]) || []);
    setLoading(false);
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
        delivery_preference: deliveryPref,
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
      postal_code: "",
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
      postal_code: addr.postal_code,
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

      {/* Avatar + email row */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || "User"}
            size="lg"
          />
          <div>
            <p className="font-semibold text-midnight">{profile?.full_name}</p>
            <p className="flex items-center gap-1.5 text-sm text-slate-light">
              <Mail size={13} />
              {profile?.email}
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
                  postal_code: "",
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
                    {addr.street}, {addr.city}, {addr.state}{" "}
                    {addr.postal_code}
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
              <Input
                label="Postal Code"
                placeholder="100001"
                value={addressForm.postal_code}
                onChange={(e) =>
                  setAddressForm((f) => ({
                    ...f,
                    postal_code: e.target.value,
                  }))
                }
              />

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

      {/* Delivery preferences */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={18} className="text-royal" />
            Delivery Preferences
          </CardTitle>
          <CardDescription>
            Set your preferred delivery method for new orders
          </CardDescription>
        </CardHeader>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "door_to_door",
              label: "Door-to-Door",
              desc: "Delivered to your address",
              icon: Truck,
            },
            {
              value: "pickup_office",
              label: "Pickup Office",
              desc: "Collect at a partner location",
              icon: Building2,
            },
          ].map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setDeliveryPref(value)}
              className={`flex items-start gap-3 rounded-[--radius-md] border-2 p-4 text-left transition-all duration-200 ${
                deliveryPref === value
                  ? "border-royal bg-royal/5 text-royal"
                  : "border-mist-dark text-slate hover:border-royal/50"
              }`}
            >
              <Icon size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-slate-light mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="md"
          className="mt-4"
          onClick={saveProfile}
          loading={saving}
        >
          <Save size={16} className="mr-2" />
          Save Preferences
        </Button>
      </Card>
    </div>
  );
}
