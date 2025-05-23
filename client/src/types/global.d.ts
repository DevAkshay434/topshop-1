interface FormContext {
  productIds?: string[];
  collectionIds?: string[];
  keywords?: string[];
  blogId?: string;
  [key: string]: any;
}

interface Window {
  TopshopSEO?: {
    formContext?: FormContext;
    [key: string]: any;
  };
  productId?: string;
}