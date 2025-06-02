// Shopify Metaobjects service for author management
import axios from 'axios';
import { ShopifyStore } from '../models/shopify';

export interface Author {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  linkedinUrl: string;
  handle: string;
}

export interface AuthorMetaobject {
  id: string;
  handle: string;
  fields: {
    name: { value: string };
    description: { value: string };
    avatar_url: { value: string };
    linkedin_url: { value: string };
  };
}

export class MetaobjectService {
  private store: ShopifyStore;
  
  constructor(store: ShopifyStore) {
    this.store = store;
  }

  /**
   * Create the author metaobject definition if it doesn't exist
   */
  async ensureAuthorMetaobjectDefinition(): Promise<void> {
    try {
      // First check if the definition already exists
      const definitionsResponse = await axios.get(
        `https://${this.store.shopName}/admin/api/2023-10/metaobject_definitions.json`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      const existingDefinition = definitionsResponse.data.metaobject_definitions.find(
        (def: any) => def.type === 'author'
      );

      if (existingDefinition) {
        console.log('Author metaobject definition already exists');
        return;
      }

      // Create the author metaobject definition
      const definitionData = {
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
              description: 'A brief description or bio of the author',
              type: 'multi_line_text_field',
              required: false
            },
            {
              key: 'avatar_url',
              name: 'Avatar URL',
              description: 'URL to the author\'s profile image',
              type: 'url',
              required: false
            },
            {
              key: 'linkedin_url',
              name: 'LinkedIn Profile URL',
              description: 'URL to the author\'s LinkedIn profile',
              type: 'url',
              required: false
            }
          ]
        }
      };

      await axios.post(
        `https://${this.store.shopName}/admin/api/2023-10/metaobject_definitions.json`,
        definitionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      console.log('Author metaobject definition created successfully');
    } catch (error: any) {
      console.error('Error ensuring author metaobject definition:', error);
      if (error.response) {
        console.error('Shopify API error:', error.response.data);
      }
      throw new Error(`Failed to ensure author metaobject definition: ${error.message}`);
    }
  }

  /**
   * Get all authors from metaobjects
   */
  async getAuthors(): Promise<Author[]> {
    try {
      await this.ensureAuthorMetaobjectDefinition();

      const response = await axios.get(
        `https://${this.store.shopName}/admin/api/2023-10/metaobjects.json?type=author&limit=50`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      const metaobjects = response.data.metaobjects || [];
      
      return metaobjects.map((metaobject: AuthorMetaobject) => ({
        id: metaobject.id,
        handle: metaobject.handle,
        name: metaobject.fields.name?.value || '',
        description: metaobject.fields.description?.value || '',
        avatarUrl: metaobject.fields.avatar_url?.value || '',
        linkedinUrl: metaobject.fields.linkedin_url?.value || ''
      }));
    } catch (error: any) {
      console.error('Error fetching authors:', error);
      if (error.response) {
        console.error('Shopify API error:', error.response.data);
      }
      throw new Error(`Failed to fetch authors: ${error.message}`);
    }
  }

  /**
   * Create a new author
   */
  async createAuthor(authorData: {
    name: string;
    description: string;
    avatarUrl: string;
    linkedinUrl: string;
  }): Promise<Author> {
    try {
      await this.ensureAuthorMetaobjectDefinition();

      // Generate a handle from the name
      const handle = authorData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const metaobjectData = {
        metaobject: {
          type: 'author',
          handle: handle,
          fields: {
            name: authorData.name,
            description: authorData.description,
            avatar_url: authorData.avatarUrl,
            linkedin_url: authorData.linkedinUrl
          }
        }
      };

      const response = await axios.post(
        `https://${this.store.shopName}/admin/api/2023-10/metaobjects.json`,
        metaobjectData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      const createdMetaobject = response.data.metaobject;
      
      return {
        id: createdMetaobject.id,
        handle: createdMetaobject.handle,
        name: createdMetaobject.fields.name?.value || '',
        description: createdMetaobject.fields.description?.value || '',
        avatarUrl: createdMetaobject.fields.avatar_url?.value || '',
        linkedinUrl: createdMetaobject.fields.linkedin_url?.value || ''
      };
    } catch (error: any) {
      console.error('Error creating author:', error);
      if (error.response) {
        console.error('Shopify API error:', error.response.data);
      }
      throw new Error(`Failed to create author: ${error.message}`);
    }
  }

  /**
   * Update an existing author
   */
  async updateAuthor(authorId: string, authorData: {
    name: string;
    description: string;
    avatarUrl: string;
    linkedinUrl: string;
  }): Promise<Author> {
    try {
      const metaobjectData = {
        metaobject: {
          fields: {
            name: authorData.name,
            description: authorData.description,
            avatar_url: authorData.avatarUrl,
            linkedin_url: authorData.linkedinUrl
          }
        }
      };

      const response = await axios.put(
        `https://${this.store.shopName}/admin/api/2023-10/metaobjects/${authorId}.json`,
        metaobjectData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      const updatedMetaobject = response.data.metaobject;
      
      return {
        id: updatedMetaobject.id,
        handle: updatedMetaobject.handle,
        name: updatedMetaobject.fields.name?.value || '',
        description: updatedMetaobject.fields.description?.value || '',
        avatarUrl: updatedMetaobject.fields.avatar_url?.value || '',
        linkedinUrl: updatedMetaobject.fields.linkedin_url?.value || ''
      };
    } catch (error: any) {
      console.error('Error updating author:', error);
      if (error.response) {
        console.error('Shopify API error:', error.response.data);
      }
      throw new Error(`Failed to update author: ${error.message}`);
    }
  }

  /**
   * Delete an author
   */
  async deleteAuthor(authorId: string): Promise<void> {
    try {
      await axios.delete(
        `https://${this.store.shopName}/admin/api/2023-10/metaobjects/${authorId}.json`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      console.log(`Author ${authorId} deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting author:', error);
      if (error.response) {
        console.error('Shopify API error:', error.response.data);
      }
      throw new Error(`Failed to delete author: ${error.message}`);
    }
  }

  /**
   * Get author by ID
   */
  async getAuthorById(authorId: string): Promise<Author | null> {
    try {
      const response = await axios.get(
        `https://${this.store.shopName}/admin/api/2023-10/metaobjects/${authorId}.json`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.store.accessToken
          }
        }
      );

      const metaobject = response.data.metaobject;
      
      return {
        id: metaobject.id,
        handle: metaobject.handle,
        name: metaobject.fields.name?.value || '',
        description: metaobject.fields.description?.value || '',
        avatarUrl: metaobject.fields.avatar_url?.value || '',
        linkedinUrl: metaobject.fields.linkedin_url?.value || ''
      };
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('Error fetching author by ID:', error);
      throw new Error(`Failed to fetch author: ${error.message}`);
    }
  }
}