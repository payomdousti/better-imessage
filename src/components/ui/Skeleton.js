/**
 * Skeleton loading components
 * @module components/ui/Skeleton
 * 
 * Provides placeholder components that match real content layout
 * for smooth loading transitions without layout shift.
 */

import React, { memo } from 'react';

/**
 * Base skeleton pulse animation element
 */
export const Skeleton = memo(function Skeleton({ className = '', style }) {
  return (
    <div 
      className={`skeleton-pulse bg-muted-foreground/10 rounded ${className}`}
      style={style}
    />
  );
});

/**
 * Skeleton for a conversation list item
 */
export const ConversationSkeleton = memo(function ConversationSkeleton() {
  return (
    <div className="px-3 py-3 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
});

/**
 * Skeleton for multiple conversation items
 */
export const ConversationListSkeleton = memo(function ConversationListSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </>
  );
});

/**
 * Skeleton for a message bubble
 */
export const MessageSkeleton = memo(function MessageSkeleton({ isFromMe = false, width = 'w-48' }) {
  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <Skeleton className={`h-8 ${width} rounded-2xl`} />
    </div>
  );
});

/**
 * Skeleton for message groups
 */
export const MessageListSkeleton = memo(function MessageListSkeleton() {
  return (
    <div className="px-3 py-2 space-y-2">
      <MessageSkeleton isFromMe={false} width="w-32" />
      <MessageSkeleton isFromMe={false} width="w-48" />
      <MessageSkeleton isFromMe={true} width="w-24" />
      <MessageSkeleton isFromMe={true} width="w-40" />
      <MessageSkeleton isFromMe={false} width="w-56" />
      <MessageSkeleton isFromMe={true} width="w-36" />
      <MessageSkeleton isFromMe={false} width="w-28" />
      <MessageSkeleton isFromMe={true} width="w-52" />
    </div>
  );
});

/**
 * Skeleton for media grid item
 */
export const MediaItemSkeleton = memo(function MediaItemSkeleton() {
  return <Skeleton className="aspect-square rounded-sm" />;
});

/**
 * Skeleton for media grid
 */
export const MediaGridSkeleton = memo(function MediaGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-4 gap-0.5 p-1">
      {Array.from({ length: count }).map((_, i) => (
        <MediaItemSkeleton key={i} />
      ))}
    </div>
  );
});

/**
 * Skeleton for a link preview
 */
export const LinkSkeleton = memo(function LinkSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
});

/**
 * Skeleton for links list
 */
export const LinksListSkeleton = memo(function LinksListSkeleton({ count = 4 }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LinkSkeleton key={i} />
      ))}
    </div>
  );
});

/**
 * Skeleton for conversation header
 */
export const ConversationHeaderSkeleton = memo(function ConversationHeaderSkeleton() {
  return (
    <div className="flex-shrink-0 px-4 py-3 border-b bg-background flex items-center justify-between">
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-16 rounded" />
    </div>
  );
});

/**
 * Full conversation skeleton (header + messages)
 */
export const ConversationSkeleton2 = memo(function ConversationSkeleton2() {
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-muted/20 overflow-hidden">
      <ConversationHeaderSkeleton />
      <div className="flex-shrink-0 bg-background px-2 py-1.5 flex gap-4 border-b">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageListSkeleton />
      </div>
    </div>
  );
});

export default Skeleton;

