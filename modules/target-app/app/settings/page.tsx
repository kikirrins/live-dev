import { Header } from "@/components/Header";
import { SettingsPage } from "@/components/SettingsPage";
import { Footer } from "@/components/Footer";

export default function Settings() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <SettingsPage />
      </main>
      <Footer />
    </div>
  );
}
