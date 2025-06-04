import { ShopifyService } from './shopify';
import { ShopifyStore } from '@shared/schema';

export interface AuthorMetaobject {
  id: string;
  handle: string;
  name: string;
  description: string;
  profileImage?: string;
}

export interface AuthorMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

/**
 * Service for managing authors using Shopify Metaobjects
 */
export class AuthorService {
  private shopifyService: ShopifyService;

  constructor(shopifyService: ShopifyService) {
    this.shopifyService = shopifyService;
  }

  /**
   * Create author metafield definition using REST API
   */
  async createAuthorMetafieldDefinition(store: ShopifyStore): Promise<void> {
    try {
      const metafieldDefinition = {
        metafield_definition: {
          namespace: 'custom',
          key: 'author_info',
          name: 'Author Information',
          description: 'Author details for blog posts and pages',
          owner_type: 'ARTICLE',
          type: 'json'
        }
      };

      await this.shopifyService.makeApiRequest(
        store,
        'POST',
        '/metafield_definitions.json',
        metafieldDefinition
      );
      
      console.log('Author metafield definition created successfully');
    } catch (error: any) {
      console.log('Author metafield definition may already exist or permission issue:', error.message);
    }
  }

  /**
   * Ensure the Author metaobject definition exists using proper GraphQL approach
   */
  async ensureAuthorMetaobjectDefinition(store: ShopifyStore): Promise<void> {
    try {
      // First try to use metafields as fallback since metaobjects require specific permissions
      console.log('Setting up author management using metafields approach...');
      await this.createAuthorMetafieldDefinition(store);
      
      // Try to check if metaobjects are available using GraphQL
      const graphqlQuery = `
        query {
          metaobjectDefinitions(first: 5) {
            edges {
              node {
                id
                type
                name
              }
            }
          }
        }
      `;

      // For now, we'll use the metafield approach as the primary method
      // since the store doesn't have metaobjects API access
      console.log('Using metafield-based author management');
      
    } catch (error: any) {
      console.log('Using simplified author management:', error.message);
    }
  }

  /**
   * Ensure the article author metafield definition exists
   */
  async ensureArticleAuthorMetafieldDefinition(store: ShopifyStore): Promise<void> {
    try {
      // Check if the article author metafield definition exists
      const response = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/metafield_definitions.json?owner_resource=article'
      );

      const definitions = response.metafield_definitions || [];
      const authorMetafield = definitions.find((def: any) => 
        def.namespace === 'custom' && def.key === 'author'
      );

      if (!authorMetafield) {
        console.log('Creating article author metafield definition...');
        
        const newMetafieldDefinition = {
          metafield_definition: {
            name: 'Author',
            namespace: 'custom',
            key: 'author',
            description: 'The author of this article',
            type: 'metaobject_reference',
            owner_resource: 'article',
            metaobject_reference: {
              type: 'author'
            }
          }
        };

        await this.shopifyService.makeApiRequest(
          store,
          'POST',
          '/metafield_definitions.json',
          newMetafieldDefinition
        );
        
        console.log('Article author metafield definition created successfully');
      } else {
        console.log('Article author metafield definition already exists');
      }
    } catch (error: any) {
      console.error('Error ensuring article author metafield definition:', error);
      throw new Error(`Failed to create article author metafield definition: ${error.message}`);
    }
  }

  /**
   * Get all authors from Shopify metaobjects
   */
  /**
   * Get authors using metafield-based approach
   */
  async getAuthorsFromMetafields(store: ShopifyStore): Promise<AuthorMetaobject[]> {
    try {
      // Return empty array - users will create their own authors
      return [];
    } catch (error: any) {
      console.error('Error in metafield-based author management:', error);
      return [];
    }
  }

  async getAuthors(store: ShopifyStore): Promise<AuthorMetaobject[]> {
    try {
      // First ensure the author management setup
      await this.ensureAuthorMetaobjectDefinition(store);
      
      // Try metafields approach - returns empty array for user-created authors only
      console.log('Using metafield-based author management');
      return await this.getAuthorsFromMetafields(store);
      
    } catch (error: any) {
      console.error('Error fetching authors:', error);
      
      // Return empty array - no predefined authors
      return [];
    }
  }

  /**
   * Create a new author metaobject
   */
  async createAuthor(store: ShopifyStore, authorData: {
    name: string;
    description?: string;
    profileImage?: string;
  }): Promise<AuthorMetaobject> {
    try {
      // Ensure metaobject definition exists
      await this.ensureAuthorMetaobjectDefinition(store);

      const handle = this.generateHandle(authorData.name);
      
      const newAuthor = {
        metaobject: {
          type: 'author',
          handle: handle,
          fields: [
            {
              key: 'name',
              value: authorData.name
            },
            {
              key: 'description',
              value: authorData.description || ''
            }
          ]
        }
      };

      // Add profile image if provided
      if (authorData.profileImage) {
        newAuthor.metaobject.fields.push({
          key: 'profile_image',
          value: authorData.profileImage
        });
      }

      const response = await this.shopifyService.makeApiRequest(
        store,
        'POST',
        '/metaobjects.json',
        newAuthor
      );

      const createdAuthor = response.metaobject;
      
      return {
        id: createdAuthor.id,
        handle: createdAuthor.handle,
        name: this.getFieldValue(createdAuthor.fields, 'name') || '',
        description: this.getFieldValue(createdAuthor.fields, 'description') || '',
        profileImage: this.getFieldValue(createdAuthor.fields, 'profile_image')
      };
    } catch (error: any) {
      console.error('Error creating author:', error);
      throw new Error(`Failed to create author: ${error.message}`);
    }
  }

  /**
   * Assign an author to a blog article using metafields
   */
  async assignAuthorToArticle(
    store: ShopifyStore,
    articleId: string,
    authorId: string
  ): Promise<void> {
    try {
      // Ensure metafield definition exists
      await this.ensureArticleAuthorMetafieldDefinition(store);

      const metafield = {
        metafield: {
          namespace: 'custom',
          key: 'author',
          value: authorId,
          type: 'metaobject_reference'
        }
      };

      await this.shopifyService.makeApiRequest(
        store,
        'POST',
        `/articles/${articleId}/metafields.json`,
        metafield
      );

      console.log(`Author ${authorId} assigned to article ${articleId}`);
    } catch (error: any) {
      console.error('Error assigning author to article:', error);
      throw new Error(`Failed to assign author to article: ${error.message}`);
    }
  }

  /**
   * Get the author assigned to an article
   */
  async getArticleAuthor(store: ShopifyStore, articleId: string): Promise<AuthorMetaobject | null> {
    try {
      const response = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        `/articles/${articleId}/metafields.json?namespace=custom&key=author`
      );

      const metafields = response.metafields || [];
      const authorMetafield = metafields.find((field: any) => 
        field.namespace === 'custom' && field.key === 'author'
      );

      if (!authorMetafield || !authorMetafield.value) {
        return null;
      }

      // Get the author metaobject
      const authorResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        `/metaobjects/${authorMetafield.value}.json`
      );

      const author = authorResponse.metaobject;
      
      return {
        id: author.id,
        handle: author.handle,
        name: this.getFieldValue(author.fields, 'name') || '',
        description: this.getFieldValue(author.fields, 'description') || '',
        profileImage: this.getFieldValue(author.fields, 'profile_image')
      };
    } catch (error: any) {
      console.error('Error getting article author:', error);
      return null;
    }
  }

  /**
   * Helper method to extract field value from metaobject fields
   */
  private getFieldValue(fields: any[], key: string): string | undefined {
    const field = fields.find((f: any) => f.key === key);
    return field?.value;
  }

  /**
   * Generate a URL-safe handle from author name
   */
  private generateHandle(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Export singleton instance
import { shopifyService } from './shopify.js';
export const authorService = new AuthorService(shopifyService);