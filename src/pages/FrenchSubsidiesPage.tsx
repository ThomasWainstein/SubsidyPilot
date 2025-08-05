import { FrenchSubsidySearch } from "@/components/subsidy/FrenchSubsidySearch";

export default function FrenchSubsidiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">AgriTool</h1>
              <nav className="flex space-x-4">
                <a href="/" className="text-muted-foreground hover:text-foreground">Accueil</a>
                <a href="/search" className="text-muted-foreground hover:text-foreground">Recherche</a>
                <a href="/french-subsidies" className="text-foreground font-medium">Aides Françaises</a>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <FrenchSubsidySearch />
      </main>
    </div>
  );
}