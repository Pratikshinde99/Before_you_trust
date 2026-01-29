import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Before You Trust</span>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Helping you make informed decisions through community-sourced incident reports.
          </p>
          
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Guidelines</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
