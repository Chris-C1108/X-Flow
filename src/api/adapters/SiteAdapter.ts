import { FetchParams } from '../ApiClient';

export interface UnifiedVideoItem {
    id: string;                  // Unique post/video identifier
    url_cd: string;              // Code for detail fetching/comments
    thumbnail: string;           // Cover/preview image URL
    title: string;               // Video description or tweet text
    tweet_account: string;       // Twitter username (without @)
    authorDisplayName?: string;  // Author's display name
    favorite: number;            // Likes or bookmark count
    pv: number;                  // Views/plays count
    duration: number;            // Duration in seconds
    url: string;                 // Final MP4 stream URL (if available immediately)
    isDetailsLoaded: boolean;    // Whether final video URL and details are fetched
    originalUrl?: string;        // External post link (e.g. x.com status link)
}

export interface FetchListResult {
    posts: UnifiedVideoItem[];
    nextCursor: string;
    hasMore: boolean;
}

export interface FilterOption {
    id: string;
    label: string;
    en?: string;
    icon?: string;
}

export interface FilterGroup {
    id: string; // e.g. "range" | "sort" | "category" | "duration" | "tag"
    title: string;
    type: 'range' | 'sort' | 'category' | 'tag';
    options: FilterOption[];
}

export interface HeroRange {
    id: string;
    label: string;
    en: string;
    icon: string;
}

export interface SiteAdapter {
    id: string;
    name: string;
    matches(hostname: string): boolean;
    
    // Core Fetch API
    fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult>;
    
    // UI Capabilities Configuration
    getFilterGroups?(isAnime: boolean): FilterGroup[];
    getHeroRanges?(isAnime: boolean): HeroRange[];
    
    // Video Resolution & Lazy Details
    fetchDetailHtml?(postId: string): Promise<string>;
    parseDetailHtml?(html: string): { title?: string; tweetAccount?: string; videoPath?: string };
    resolveVideoUrl?(videoPath: string): Promise<string>;
    
    // User Profile / Related Videos
    fetchAuthorVideos?(username: string, cursor?: string): Promise<FetchListResult>;
}
