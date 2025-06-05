import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

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
}): string {
  const avatarInitials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarImg = author.profileImage 
    ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;" />`
    : `<div style="width: 64px; height: 64px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 18px;">${avatarInitials}</div>`;

  return `
    <div id="author-${author.id}" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; background: #ffffff;">
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        ${avatarImg}
        <div style="flex: 1;">
          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">${author.name}</h3>
          ${author.description ? `<p style="color: #4b5563; line-height: 1.6; margin: 0;">${author.description}</p>` : ''}
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
}): string {
  const avatarInitials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarImg = author.profileImage 
    ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />`
    : `<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 12px;">${avatarInitials}</div>`;

  return `
    <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0; padding: 8px 0;">
      ${avatarImg}
      <span style="color: #6b7280; font-size: 14px;">
        Written by <a href="#author-${author.id}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${author.name}</a>
      </span>
    </div>
  `;
}