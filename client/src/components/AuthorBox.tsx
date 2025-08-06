import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

// Utility function to calculate reading time for content
export function calculateReadingTime(content: string): { minutes: number; seconds: number; display: string } {
  if (!content || typeof content !== 'string') {
    return { minutes: 0, seconds: 0, display: '1 min read' };
  }

  // Remove HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, '').trim();
  
  // Count words (split by whitespace and filter out empty strings)
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Average reading speed is 200-250 words per minute, we'll use 225
  const wordsPerMinute = 225;
  
  // Calculate total minutes as decimal
  const totalMinutes = wordCount / wordsPerMinute;
  
  // Convert to minutes and seconds
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  
  // Create display string
  let display: string;
  if (minutes === 0) {
    display = '1 min read'; // Minimum 1 minute for very short content
  } else if (minutes === 1 && seconds < 30) {
    display = '1 min read';
  } else if (minutes > 0 && seconds >= 30) {
    display = `${minutes + 1} min read`; // Round up if seconds >= 30
  } else {
    display = `${minutes} min read`;
  }
  
  return { minutes, seconds, display };
}

export interface AuthorBoxProps {
  author: {
    id: string;
    name: string;
    description?: string;
    profileImage?: string;
  };
  className?: string;
}

export function AuthorBox({ author, className = "" }: AuthorBoxProps) {
  return (
    <Card className={`author-box ${className}`} id={`author-${author.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={author.profileImage} alt={author.name} />
            <AvatarFallback className="text-lg">
              {author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {author.name}
            </h3>
            {author.description && (
              <p className="text-gray-600 leading-relaxed">
                {author.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Function to generate author box HTML for inclusion in Shopify content
export function generateAuthorBoxHTML(author: {
  id: string;
  name: string;
  description?: string;
  profileImage?: string;
  linkedinUrl?: string;
}, content?: string): string {
  const avatarInitials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarImg = author.profileImage 
    ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; display: block; flex-shrink: 0;" />`
    : `<div style="width: 48px; height: 48px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 14px; flex-shrink: 0;">${avatarInitials}</div>`;

  // Calculate reading time if content is provided
  const readingTime = content ? calculateReadingTime(content) : null;
  const readingTimeText = readingTime ? ` • ${readingTime.display}` : '';

  // LinkedIn "Learn More" button if LinkedIn URL is available
  const linkedinButton = author.linkedinUrl 
    ? `<a href="${author.linkedinUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #0077b5; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">Learn More</a>`
    : '';

  return `
    <div id="author-${author.id}" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; background: #ffffff;">
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        ${avatarImg}
        <div style="flex: 1;">
          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">${author.name}${readingTimeText}</h3>
          ${author.description ? `<p style="color: #4b5563; line-height: 1.6; margin: 0 0 12px 0;">${author.description}</p>` : ''}
          ${linkedinButton}
        </div>
      </div>
    </div>
  `;
}

// Function to generate "Written by" HTML for inclusion in Shopify content
export function generateWrittenByHTML(author: {
  id: string;
  name: string;
  profileImage?: string;
}, content?: string): string {
  const avatarInitials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarImg = author.profileImage 
    ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />`
    : `<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 12px;">${avatarInitials}</div>`;

  // Calculate reading time if content is provided
  const readingTime = content ? calculateReadingTime(content) : null;
  const readingTimeText = readingTime ? ` • ${readingTime.display}` : '';

  return `
    <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0; padding: 8px 0;">
      ${avatarImg}
      <span style="color: #6b7280; font-size: 14px;">
        Written by <a href="#author-${author.id}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${author.name}</a>${readingTimeText}
      </span>
    </div>
  `;
}