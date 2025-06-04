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
   * Ensure the Author metaobject definition exists, create if not
   */
  async ensureAuthorMetaobjectDefinition(store: ShopifyStore): Promise<void> {
    try {
      // Check if the author metaobject definition exists
      const response = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/metaobject_definitions.json'
      );

      const definitions = response.metaobject_definitions || [];
      const authorDefinition = definitions.find((def: any) => def.type === 'author');

      if (!authorDefinition) {
        console.log('Creating Author metaobject definition...');
        
        // Create the Author metaobject definition
        const newDefinition = {
          metaobject_definition: {
            type: 'author',
            name: 'Author',
            description: 'Blog post and page authors',
            field_definitions: [
              {
                key: 'name',
                name: 'Author Name',
                description: 'The full name of the author',
                type: 'single_line_text_field',
                required: true
              },
              {
                key: 'description',
                name: 'Author Description',
                description: 'A brief bio or description of the author',
                type: 'multi_line_text_field',
                required: false
              },
              {
                key: 'profile_image',
                name: 'Profile Image',
                description: 'Author profile photo',
                type: 'file_reference',
                required: false
              }
            ]
          }
        };

        await this.shopifyService.makeApiRequest(
          store,
          'POST',
          '/metaobject_definitions.json',
          newDefinition
        );
        
        console.log('Author metaobject definition created successfully');
      } else {
        console.log('Author metaobject definition already exists');
      }
    } catch (error: any) {
      console.error('Error ensuring Author metaobject definition:', error);
      throw new Error(`Failed to create Author metaobject definition: ${error.message}`);
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
  async getAuthors(store: ShopifyStore): Promise<AuthorMetaobject[]> {
    try {
      const response = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/metaobjects.json?type=author&limit=50'
      );

      const metaobjects = response.metaobjects || [];
      
      return metaobjects.map((metaobject: any) => ({
        id: metaobject.id,
        handle: metaobject.handle,
        name: this.getFieldValue(metaobject.fields, 'name') || '',
        description: this.getFieldValue(metaobject.fields, 'description') || '',
        profileImage: this.getFieldValue(metaobject.fields, 'profile_image')
      }));
    } catch (error: any) {
      console.error('Error fetching authors:', error);
      throw new Error(`Failed to fetch authors: ${error.message}`);
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