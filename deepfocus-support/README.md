# DeepFocus Support Portal (Next.js + Razorpay + Supabase)

This is the production-ready **Support DeepFocus** portal built with Next.js (App Router), TypeScript, Supabase, and Razorpay. It features real-time contributor walls, animated progress tracking, cryptographic signature verification, and a premium dark-themed glassmorphic user interface.

---

## 📁 1. Project Folder Structure

```
deepfocus-support/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── donate/
│   │   │       ├── create-order/
│   │   │       │   └── route.ts         # Server-side validation & Razorpay order creation
│   │   │       └── verify/
│   │   │           └── route.ts         # HMAC-SHA256 signature verification & Supabase logging
│   │   ├── globals.css                  # Tailwind styles & dark mode customization
│   │   ├── layout.tsx                   # Font provisioning, metadata & global frame
│   │   └── page.tsx                     # Server-side page fetching initial stats & wall entries
│   ├── components/
│   │   ├── SupportHero.tsx              # Beautiful premium glassmorphic hero
│   │   ├── StatsSection.tsx             # Real-time goals progress tracker
│   │   ├── DonationForm.tsx             # Razorpay client checkout widget
│   │   ├── ContributorWall.tsx          # Real-time contributor wall of fame
│   │   └── LoadingSpinner.tsx           # Reusable premium loading element
│   ├── lib/
│   │   └── supabase.ts                  # Supabase public client & admin client utilities
│   └── types/
│       └── index.ts                     # TypeScript schemas (Donation, Stats)
├── supabase/
│   └── migrations/
│       └── 20260627000000_create_donations.sql   # SQL migration schema with RLS policies
├── .env.example                         # Documented local/prod environment variables
├── next.config.js                       # Next.js configurations
├── postcss.config.js                    # PostCSS configurations
├── tailwind.config.js                   # Tailwind configurations
├── tsconfig.json                        # TypeScript strict configurations
└── README.md                            # Comprehensive operational manual (This file)
```

---

## 🛠️ 2. Local Setup Instructions

1. **Navigate to the support directory**:
   ```bash
   cd deepfocus-support
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project credentials and Razorpay API keys (test key pairs can be generated in the Razorpay Dashboard).

4. **Apply SQL Migration**:
   Go to your Supabase Project Dashboard -> SQL Editor, copy the contents of `supabase/migrations/20260627000000_create_donations.sql`, paste it, and click **Run**.

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view and test the support page.

---

## 🚀 3. Vercel Deployment Instructions

1. **Push code changes to GitHub**:
   ```bash
   git add -A
   git commit -m "feat: add Next.js App Router support portal with Razorpay"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to your Vercel Dashboard and click **Add New** -> **Project**.
   - Import your `DeepFocus` repository.
   - Set the **Root Directory** to `deepfocus-support`.
   - Under **Environment Variables**, add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
   - Click **Deploy**. Vercel will build, provision SSL certificates, and deploy the application.

---

## 🛡️ 4. Production Checklist

- [ ] **API Keys**: Change Razorpay key ID and secret from `rzp_test_...` to live keys (`rzp_live_...`).
- [ ] **Row Level Security (RLS)**: Verify RLS is enabled on the `donations` table.
- [ ] **Supabase Realtime**: Ensure realtime functionality is enabled on the `donations` table for instant wall updates.
- [ ] **Rate Limiting**: Set Vercel API rate limits or coordinate server-side rate limits if traffic grows.
- [ ] **SSL (HTTPS)**: Ensure all webhook and payment requests run strictly over HTTPS (enforced by Vercel by default).
- [ ] **Error Audits**: Confirm environment variable `SUPABASE_SERVICE_ROLE_KEY` is not exposed in the bundle (never prefixed with `NEXT_PUBLIC_`).

---

## 🧪 5. Testing Checklist

1. **Order Creation**: Pick a preset (e.g. ₹99) and verify the Razorpay checkout overlay loads immediately with the correct amount.
2. **Custom Validation**: Input an invalid amount (e.g. ₹5 or ₹200,000) and verify that validation catches it and blocks order creation.
3. **Checkout Cancellation**: Close the Razorpay checkout modal manually and ensure the status updates to "Payment cancelled" smoothly.
4. **Signature Verification**: Complete a mock transaction using Razorpay's test card details. Verify:
   - The modal closes.
   - A success banner is displayed.
   - The database status changes from `pending` to `success`.
   - `signature_verified` is marked `true`.
5. **Real-time Synchronization**: Open two browser tabs side-by-side. Complete a payment in one and verify that the stats gauge and contributor wall update instantly in the second tab without reloading.
