# Free Lunch

A free, open-source personal finance management app inspired by the beloved Grip app from the Netherlands.

## Features

- **Automatic Bank Sync** - Connect to ABN AMRO via Enable Banking API
- **Smart Categorization** - AI-powered merchant recognition that learns from your corrections
- **Custom Categories** - Hierarchical categories that match your mental model
- **Split Transactions** - Divide purchases across multiple categories
- **Reimbursement Tracking** - Track work expenses and personal IOUs separately
- **Clean Dashboard** - Clear insights into your spending patterns

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **UI Components:** shadcn/ui, Radix UI
- **Backend:** Firebase (Auth, Firestore, Cloud Functions)
- **Bank API:** Enable Banking (PSD2)
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/free-lunch.git
cd free-lunch

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Development with Firebase Emulators

```bash
# Start Firebase emulators
npm run firebase:emulators

# In another terminal
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run e2e` | Run E2E tests |
| `npm run typecheck` | Run TypeScript type checking |

## Project Structure

```
src/
├── components/
│   ├── ui/           # Base UI components (Button, Card, etc.)
│   ├── layout/       # Layout components (Sidebar, Header)
│   ├── dashboard/    # Dashboard-specific components
│   ├── transactions/ # Transaction-related components
│   ├── categories/   # Category management components
│   └── reimbursements/ # Reimbursement tracking components
├── pages/            # Route pages
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
├── types/            # TypeScript type definitions
├── contexts/         # React contexts
└── test/             # Test utilities and fixtures
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Free Lunch** - Know where your money went.
