"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardTitle } from "@/components/ui/card";
import {
  Upload,
  X,
  Video,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";

type Category = { id: string; name: string; slug: string };

export default function AddProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sellerApproved, setSellerApproved] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: seller } = await supabase
          .from("sellers")
          .select("status")
          .eq("id", user.id)
          .single();
        setSellerApproved(seller?.status === "approved");
      }
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      setCategories(cats || []);
    }
    load();
  }, []);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 8 - images.length;
    const newImages = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadFile(file: File, bucket: string): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);
    const res = await fetch("/api/seller/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  }

  async function handleSubmit(asDraft: boolean) {
    setError("");
    if (!name.trim()) { setError("Product name is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    if (!categoryId) { setError("Select a category"); return; }
    if (!price || parseFloat(price) <= 0) { setError("Enter a valid price"); return; }
    if (!stockQuantity || parseInt(stockQuantity) <= 0) { setError("Enter stock quantity"); return; }
    if (images.length === 0 && !asDraft) { setError("Add at least one image"); return; }

    setSaving(true);
    setUploading(true);

    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        const url = await uploadFile(img.file, "product-images");
        if (url) imageUrls.push(url);
      }

      let videoUrl: string | null = null;
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, "product-videos");
      }
      setUploading(false);

      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          categoryId,
          price: parseFloat(price),
          stockQuantity: parseInt(stockQuantity),
          imageUrls,
          videoUrl,
          status: asDraft ? "draft" : "paused",
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create product"); return; }

      setSuccess(data.message);
      setTimeout(() => router.push("/seller/products"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  if (sellerApproved === false) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-3">
          Complete Seller Verification First
        </h2>
        <p className="text-slate-light mb-6">
          Complete the seller onboarding process to get verified before listing products.
        </p>
        <Button variant="primary" onClick={() => router.push("/seller/onboarding")}>
          Start Seller Onboarding
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle2 className="h-16 w-16 text-emerald mx-auto mb-4" />
        <h2 className="text-xl font-bold text-midnight font-[family-name:var(--font-sora)] mb-3">{success}</h2>
        <p className="text-slate-light mb-6">Our team will review and notify you once approved.</p>
        <Button variant="primary" onClick={() => router.push("/seller/products")}>View My Products</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-[--radius-lg] bg-violet/5 border border-violet/20 p-4 flex items-start gap-3">
        <Package className="h-5 w-5 text-violet shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-midnight">How product listing works</p>
          <p className="text-xs text-slate-light mt-1">
            Add product details and images, then submit for review. Our team approves within 24 hours. Approved products go live immediately.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[--radius-md] bg-error/8 border border-error/20 px-4 py-3">
          <p className="text-sm text-error font-medium">{error}</p>
        </div>
      )}

      <Card>
        <CardTitle className="mb-4">Product Details</CardTitle>
        <div className="space-y-4">
          <Input label="Product Name *" placeholder="e.g. Designer Leather Handbag" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description *" placeholder="Material, size, features, care instructions..." value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Category *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-[--radius-md] border border-mist-dark bg-white px-4 py-3 text-slate focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20">
              <option value="">Select a category</option>
              {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₦) *" type="number" placeholder="e.g. 15000" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input label="Stock Quantity *" type="number" placeholder="e.g. 50" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-1">Product Images</CardTitle>
        <p className="text-xs text-slate-light mb-4">Up to 8 images. First image = thumbnail. JPG, PNG, WebP — Max 5MB each.</p>
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {images.map((img, i) => (
              <div key={i} className="relative group rounded-[--radius-md] overflow-hidden border border-mist aspect-square">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-violet text-white px-1.5 py-0.5 rounded-full font-semibold">Cover</span>}
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < 8 && (
          <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-mist-dark rounded-[--radius-lg] p-8 text-center hover:border-violet hover:bg-violet/5 transition-all cursor-pointer">
            <Upload className="h-8 w-8 text-slate-lighter mx-auto mb-2" />
            <p className="text-sm font-medium text-slate">Drag & drop or click to upload</p>
            <p className="text-xs text-slate-lighter mt-1">{images.length}/8 uploaded</p>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelect} className="hidden" />
      </Card>

      <Card>
        <CardTitle className="mb-1">Short Video</CardTitle>
        <p className="text-xs text-slate-light mb-4">Optional. A short clip helps buyers see your product in action. MP4, MOV — Max 50MB.</p>
        {videoFile ? (
          <div className="flex items-center gap-3 p-3 bg-cloud rounded-[--radius-md]">
            <Video className="h-5 w-5 text-violet shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-midnight truncate">{videoFile.name}</p>
              <p className="text-xs text-slate-light">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
            <button onClick={() => setVideoFile(null)} className="text-slate-lighter hover:text-error cursor-pointer"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => videoInputRef.current?.click()} className="w-full border-2 border-dashed border-mist-dark rounded-[--radius-lg] p-6 text-center hover:border-violet hover:bg-violet/5 transition-all cursor-pointer">
            <Video className="h-6 w-6 text-slate-lighter mx-auto mb-2" />
            <p className="text-sm text-slate">Upload video</p>
          </button>
        )}
        <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { if (e.target.files?.[0]) setVideoFile(e.target.files[0]); }} className="hidden" />
      </Card>

      <div className="flex gap-3">
        <Button variant="gold" size="lg" className="flex-1" loading={saving} onClick={() => handleSubmit(false)}>
          {uploading ? "Uploading files..." : "Submit for Review"}
        </Button>
        <Button variant="outline" size="lg" onClick={() => handleSubmit(true)} disabled={saving}>Save as Draft</Button>
      </div>

      <p className="text-xs text-slate-lighter text-center">
        Products are reviewed within 24 hours. Approved products appear on the marketplace immediately.
      </p>
    </div>
  );
}
