import Layout from "@/components/Layout";
import ShopifyConnectionCard from "@/components/ShopifyConnectionCard";

export default function ShopifyConnection() {
  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Shopify Connection</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your Shopify store integration
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <ShopifyConnectionCard />
      </div>
    </Layout>
  );
}
