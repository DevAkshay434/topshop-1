import { AuthorManagement } from "@/components/AuthorManagement";

export function Authors() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <AuthorManagement />
      </div>
    </div>
  );
}