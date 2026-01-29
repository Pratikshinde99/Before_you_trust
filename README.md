# Before U Trust

A crowdsourced fraud and scam reporting platform with AI-powered risk analysis. Report incidents, search entities, and make informed decisions before engaging with businesses, individuals, or services.

## 🌐 Live Application

**Visit the app:** [https://before-u-trust.lovable.app](https://before-u-trust.lovable.app)

## ✨ Features

### Core Functionality
- **Entity Search** - Search for businesses, individuals, phone numbers, websites, or services
- **Incident Reporting** - Submit detailed reports with evidence uploads
- **Risk Assessment** - AI-powered risk scoring with explainable factors
- **Entity Profiles** - View comprehensive incident history and risk breakdowns

### AI-Powered Capabilities
- **Smart Categorization** - Automatic incident classification
- **Duplicate Detection** - Identifies similar existing reports
- **Risk Calculation** - Multi-factor risk scoring algorithm
- **Pattern Summaries** - AI-generated insights on entity behavior

### Security Features
- **Rate Limiting** - Protection against spam and abuse
- **IP-based Tracking** - Anonymous submission tracking via hashed IPs
- **RLS Policies** - Row-level security for data protection
- **Evidence Verification** - Secure file storage for supporting documents

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase)
- **Database:** PostgreSQL with Row-Level Security
- **Edge Functions:** Deno-based serverless functions
- **AI Integration:** Lovable AI (Google Gemini models)
- **Build Tool:** Vite

## 📊 Risk Scoring Algorithm

The platform uses a transparent, explainable risk scoring system based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Report Frequency | 30% | Number of incidents relative to threshold |
| Severity Distribution | 30% | Weighted severity of reported incidents |
| Recent Activity | 25% | Time decay of incident reports |
| Verification Status | 15% | Confidence in report verification |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm or bun package manager

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
├── src/
│   ├── components/       # React components
│   │   ├── ai/          # AI-related components
│   │   ├── entity/      # Entity display components
│   │   ├── incident/    # Incident forms and cards
│   │   ├── layout/      # Header, Footer, Layout
│   │   ├── search/      # Search functionality
│   │   ├── shared/      # Shared components
│   │   └── ui/          # shadcn/ui components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API
│   ├── pages/           # Route pages
│   └── types/           # TypeScript definitions
├── supabase/
│   └── functions/       # Edge Functions
│       ├── _shared/     # Shared utilities
│       ├── ai-*/        # AI processing functions
│       ├── submit-incident/
│       └── search-entities/
└── public/              # Static assets
```

## 🔒 Security

- All incident submissions are rate-limited (10/hour per IP)
- Entity creation is rate-limited (20/hour per IP)
- AI calls are rate-limited (30/hour per IP)
- Database operations use service role with strict RLS policies
- IP addresses are hashed for privacy

## 📝 Incident Categories

- Fraud
- Scam
- Harassment
- Misrepresentation
- Non-delivery
- Quality Issue
- Safety Concern
- Data Breach
- Unauthorized Charges
- Other

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025 Before U Trust

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

---

**Disclaimer:** This platform provides crowdsourced information and AI-assisted risk assessments. Users should conduct their own due diligence before making decisions based on the information provided.
