import axios, { AxiosInstance } from 'axios';
import { ShopifyStore } from '@shared/schema';

/**
 * GraphQL Shopify Service - Replaces deprecated REST API endpoints
 * Addresses 2024-04 deprecation of /products and /variants endpoints
 */
export class GraphQLShopifyService {
  private clients: Map<string, AxiosInstance> = new Map();

  /**
   * Initialize GraphQL client for a store
   */
  private initializeGraphQLClient(store: ShopifyStore): void {
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2025-07/graphql.json`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    this.clients.set(store.shopName, client);
  }

  /**
   * Get GraphQL client for a store
   */
  private getGraphQLClient(store: ShopifyStore): AxiosInstance {
    const client = this.clients.get(store.shopName);
    if (client) {
      return client;
    }

    this.initializeGraphQLClient(store);
    return this.clients.get(store.shopName)!;
  }

  /**
   * Execute GraphQL query
   */
  private async executeQuery(store: ShopifyStore, query: string, variables?: any): Promise<any> {
    const client = this.getGraphQLClient(store);
    
    try {
      const response = await client.post('', {
        query,
        variables
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error: any) {
      console.error(`GraphQL query error for ${store.shopName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get products using GraphQL (replaces /products.json)
   */
  public async getProducts(store: ShopifyStore, limit: number = 50): Promise<any[]> {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              vendor
              productType
              createdAt
              updatedAt
              publishedAt
              status
              featuredImage {
                id
                url
                altText
                width
                height
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                    position
                    image {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    try {
      console.log(`Fetching products from ${store.shopName} with limit ${limit} using GraphQL`);
      const data = await this.executeQuery(store, query, { first: limit });
      
      // Transform GraphQL response to match REST API format for backward compatibility
      const products = data.products.edges.map((edge: any) => {
        const product = edge.node;
        return {
          id: product.id.replace('gid://shopify/Product/', ''),
          title: product.title,
          handle: product.handle,
          body_html: product.description,
          vendor: product.vendor,
          product_type: product.productType,
          created_at: product.createdAt,
          updated_at: product.updatedAt,
          published_at: product.publishedAt,
          status: product.status?.toLowerCase(),
          image: product.featuredImage ? {
            id: product.featuredImage.id.replace('gid://shopify/ProductImage/', ''),
            src: product.featuredImage.url,
            alt: product.featuredImage.altText,
            width: product.featuredImage.width,
            height: product.featuredImage.height
          } : null,
          images: product.images.edges.map((imgEdge: any) => ({
            id: imgEdge.node.id.replace('gid://shopify/ProductImage/', ''),
            src: imgEdge.node.url,
            alt: imgEdge.node.altText,
            width: imgEdge.node.width,
            height: imgEdge.node.height
          })),
          variants: product.variants.edges.map((variantEdge: any) => ({
            id: variantEdge.node.id.replace('gid://shopify/ProductVariant/', ''),
            title: variantEdge.node.title,
            price: variantEdge.node.price,
            sku: variantEdge.node.sku,
            inventory_quantity: variantEdge.node.inventoryQuantity,
            position: variantEdge.node.position,
            image: variantEdge.node.image ? {
              id: variantEdge.node.image.id.replace('gid://shopify/ProductImage/', ''),
              src: variantEdge.node.image.url,
              alt: variantEdge.node.image.altText,
              width: variantEdge.node.image.width,
              height: variantEdge.node.image.height
            } : null
          }))
        };
      });

      console.log(`Successfully fetched ${products.length} products using GraphQL`);
      return products;
    } catch (error: any) {
      console.error(`Error fetching products from ${store.shopName} using GraphQL:`, error.message);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Get product images using GraphQL (replaces product image fetching)
   */
  public async getProductImages(store: ShopifyStore, limit: number = 50): Promise<any[]> {
    const query = `
      query getProductImages($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              featuredImage {
                id
                url
                altText
                width
                height
              }
              images(first: 20) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    image {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      console.log(`Fetching product images from ${store.shopName} using GraphQL`);
      const data = await this.executeQuery(store, query, { first: limit });
      
      const allImages: any[] = [];
      
      // Process each product and collect images
      data.products.edges.forEach((edge: any) => {
        const product = edge.node;
        const productId = product.id.replace('gid://shopify/Product/', '');
        
        // Add featured image
        if (product.featuredImage) {
          allImages.push({
            id: `product-${productId}-image-${product.featuredImage.id.replace('gid://shopify/ProductImage/', '')}`,
            url: product.featuredImage.url,
            src: product.featuredImage.url,
            width: product.featuredImage.width || 800,
            height: product.featuredImage.height || 600,
            filename: `${product.title} - Featured Image`,
            content_type: 'image/jpeg',
            alt: product.featuredImage.altText || `${product.title} featured image`,
            source: 'shopify_media',
            assetType: 'product_image',
            productId: productId,
            productTitle: product.title,
            isPrimary: true
          });
        }

        // Add all product images
        product.images.edges.forEach((imgEdge: any, index: number) => {
          const image = imgEdge.node;
          allImages.push({
            id: `product-${productId}-image-${image.id.replace('gid://shopify/ProductImage/', '')}`,
            url: image.url,
            src: image.url,
            width: image.width || 800,
            height: image.height || 600,
            filename: `${product.title} - Image ${index + 1}`,
            content_type: 'image/jpeg',
            alt: image.altText || `${product.title} image`,
            source: 'shopify_media',
            assetType: 'product_image',
            productId: productId,
            productTitle: product.title,
            isPrimary: false
          });
        });

        // Add variant images
        product.variants.edges.forEach((variantEdge: any) => {
          const variant = variantEdge.node;
          if (variant.image) {
            allImages.push({
              id: `variant-${variant.id.replace('gid://shopify/ProductVariant/', '')}-image-${variant.image.id.replace('gid://shopify/ProductImage/', '')}`,
              url: variant.image.url,
              src: variant.image.url,
              width: variant.image.width || 800,
              height: variant.image.height || 600,
              filename: `${product.title} - ${variant.title}`,
              content_type: 'image/jpeg',
              alt: variant.image.altText || `${product.title} - ${variant.title}`,
              source: 'shopify_media',
              assetType: 'variant_image',
              productId: productId,
              productTitle: product.title,
              variantId: variant.id.replace('gid://shopify/ProductVariant/', ''),
              variantTitle: variant.title,
              isPrimary: false
            });
          }
        });
      });

      console.log(`Successfully fetched ${allImages.length} product images using GraphQL`);
      return allImages;
    } catch (error: any) {
      console.error(`Error fetching product images from ${store.shopName} using GraphQL:`, error.message);
      throw new Error(`Failed to fetch product images: ${error.message}`);
    }
  }

  /**
   * Get collections using GraphQL (if needed)
   */
  public async getCollections(store: ShopifyStore, limit: number = 50): Promise<any[]> {
    const query = `
      query getCollections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              updatedAt
              image {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    `;

    try {
      console.log(`Fetching collections from ${store.shopName} using GraphQL`);
      const data = await this.executeQuery(store, query, { first: limit });
      
      const collections = data.collections.edges.map((edge: any) => {
        const collection = edge.node;
        return {
          id: collection.id.replace('gid://shopify/Collection/', ''),
          title: collection.title,
          handle: collection.handle,
          body_html: collection.description,
          updated_at: collection.updatedAt,
          image_url: collection.image?.url || null,
          image: collection.image ? {
            id: collection.image.id,
            src: collection.image.url,
            alt: collection.image.altText,
            width: collection.image.width,
            height: collection.image.height
          } : null
        };
      });

      console.log(`Successfully fetched ${collections.length} collections using GraphQL`);
      return collections;
    } catch (error: any) {
      console.error(`Error fetching collections from ${store.shopName} using GraphQL:`, error.message);
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }
  }

  /**
   * Get products from a specific collection using GraphQL
   */
  public async getProductsFromCollection(store: ShopifyStore, collectionId: string, limit: number = 20): Promise<any[]> {
    const query = `
      query getProductsFromCollection($collectionId: ID!, $first: Int!) {
        collection(id: $collectionId) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                vendor
                productType
                tags
                createdAt
                updatedAt
                publishedAt
                featuredImage {
                  id
                  url
                  altText
                  width
                  height
                }
                images(first: 5) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price
                      sku
                      position
                      inventoryQuantity
                      image {
                        id
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      console.log(`Fetching products from collection ${collectionId} in store ${store.shopName} using GraphQL`);
      
      // Convert collection ID to proper GraphQL format if needed
      const graphqlCollectionId = collectionId.startsWith('gid://shopify/Collection/') 
        ? collectionId 
        : `gid://shopify/Collection/${collectionId}`;

      const data = await this.executeQuery(store, query, { 
        collectionId: graphqlCollectionId, 
        first: limit 
      });
      
      if (!data.collection) {
        console.log(`Collection ${collectionId} not found`);
        return [];
      }

      const products = data.collection.products.edges.map((edge: any) => {
        const product = edge.node;
        return {
          id: product.id.replace('gid://shopify/Product/', ''),
          title: product.title,
          handle: product.handle,
          body_html: product.description,
          vendor: product.vendor,
          product_type: product.productType,
          tags: product.tags,
          created_at: product.createdAt,
          updated_at: product.updatedAt,
          published_at: product.publishedAt,
          image: product.featuredImage ? {
            id: product.featuredImage.id,
            src: product.featuredImage.url,
            alt: product.featuredImage.altText,
            width: product.featuredImage.width,
            height: product.featuredImage.height
          } : null,
          images: product.images.edges.map((imageEdge: any) => {
            const image = imageEdge.node;
            return {
              id: image.id,
              src: image.url,
              alt: image.altText,
              width: image.width,
              height: image.height
            };
          }),
          variants: product.variants.edges.map((variantEdge: any) => {
            const variant = variantEdge.node;
            return {
              id: variant.id.replace('gid://shopify/ProductVariant/', ''),
              title: variant.title,
              price: variant.price,
              sku: variant.sku,
              position: variant.position,
              inventory_quantity: variant.inventoryQuantity,
              image: variant.image ? {
                id: variant.image.id,
                src: variant.image.url,
                alt: variant.image.altText,
                width: variant.image.width,
                height: variant.image.height
              } : null
            };
          })
        };
      });

      console.log(`Successfully fetched ${products.length} products from collection ${collectionId} using GraphQL`);
      return products;
    } catch (error: any) {
      console.error(`Error fetching products from collection ${collectionId} in store ${store.shopName}:`, error.message);
      throw new Error(`Failed to fetch products from collection: ${error.message}`);
    }
  }
}

// Export singleton instance
export const graphqlShopifyService = new GraphQLShopifyService();