// Jellyfin 12.1 API DTOs — subset we actually consume.
// The API returns camelCase JSON by default (RespectBrowserAcceptHeader).
// Generated shapes verified against jellyfin/Jellyfin.Api and the OpenAPI spec.

export interface JellyfinImageTags {
  Primary?: string;
  Backdrop?: string;
  Logo?: string;
  Thumb?: string;
  Banner?: string;
}

export interface JellyfinMediaStream {
  Type?: 'Video' | 'Audio' | 'Subtitle' | 'EmbeddedImage' | string;
  Index?: number;
  Codec?: string;
  DisplayTitle?: string;
  Language?: string;
  DisplayLanguage?: string;
  Title?: string;
  IsDefault?: boolean;
  IsForced?: boolean;
  IsHearingImpaired?: boolean;
  IsExternal?: boolean;
  Width?: number;
  Height?: number;
  BitRate?: number;
  Channels?: number;
  ChannelLayout?: string;
  Profile?: string;
  Level?: number;
  VideoRange?: 'SDR' | 'HDR10' | 'HLG' | 'DOVI' | 'HDR10+' | string;
  VideoRangeType?: string;
  DeliveryMethod?: 'External' | 'Embed' | 'Hls' | 'Encode' | string;
}

export interface JellyfinMediaSource {
  Id?: string;
  Container?: string;
  Path?: string;
  Size?: number;
  RunTimeTicks?: number;
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  SupportsTranscoding?: boolean;
  DefaultAudioStreamIndex?: number;
  DefaultSubtitleStreamIndex?: number;
  MediaStreams?: JellyfinMediaStream[];
  TranscodingUrl?: string;
  TranscodingSubProtocol?: 'hls' | 'http' | string;
  TranscodingContainer?: string;
  RequiresClosing?: boolean;
  LiveStreamId?: string;
}

export interface JellyfinUserData {
  PlaybackPositionTicks?: number;
  PlayCount?: number;
  IsFavorite?: boolean;
  Played?: boolean;
  LastPlayedDate?: string;
  PlayedPercentage?: number;
  UnplayedItemCount?: number;
}

export interface JellyfinPerson {
  Name?: string;
  Type?: string;
  Role?: string;
}

export interface JellyfinBaseItem {
  Id?: string;
  Name?: string;
  OriginalTitle?: string;
  Type?: string; // Movie | Series | Season | Episode | Folder | CollectionFolder | Audio | ...
  Overview?: string;
  Taglines?: string[];
  Genres?: string[];
  ProductionYear?: number;
  PremiereDate?: string;
  OfficialRating?: string;
  RunTimeTicks?: number;
  SeriesName?: string;
  SeriesId?: string;
  SeasonName?: string;
  SeasonId?: string;
  ParentIndexNumber?: number; // season number (on episodes)
  IndexNumber?: number; // episode number
  IndexNumberEnd?: number;
  ParentId?: string;
  CommunityRating?: number;
  CriticRating?: number;
  ImageTags?: JellyfinImageTags;
  BackdropImageTags?: string[];
  UserData?: JellyfinUserData;
  People?: JellyfinPerson[];
  Studios?: { Name?: string }[];
  MediaStreams?: JellyfinMediaStream[];
  MediaSources?: JellyfinMediaSource[];
  IsFolder?: boolean;
  ChildCount?: number;
  RecursiveItemCount?: number;
  Path?: string;
  Container?: string;
  ProviderIds?: Record<string, string>;
  DateCreated?: string;
  AlbumArtists?: { Name?: string }[];
  Artists?: string[];
  SeriesCount?: number;
  MovieCount?: number;
  EpisodeCount?: number;
  // Series-type "latest" views often include a nested item as the hero
  ItemCounts?: Record<string, number>;
}

export interface JellyfinUser {
  Id?: string;
  Name?: string;
  HasPassword?: boolean;
  PrimaryImageTag?: string;
  LastActivityDate?: string;
  Configuration?: {
    PlayDefaultAudioTrack?: boolean;
    SubtitleMode?: string;
    DisplayMissingEpisodes?: boolean;
  };
  Policy?: {
    IsAdministrator?: boolean;
    IsHidden?: boolean;
    IsDisabled?: boolean;
  };
}

export interface JellyfinPlayState {
  PositionTicks?: number;
  IsPaused?: boolean;
  CanSeek?: boolean;
}

export interface JellyfinSessionInfo {
  Id?: string;
  UserId?: string;
  UserName?: string;
  PlayState?: JellyfinPlayState;
}

export interface JellyfinAuthenticationResult {
  User?: JellyfinUser;
  AccessToken?: string;
  ServerId?: string;
  SessionInfo?: JellyfinSessionInfo;
}

export interface JellyfinQueryResult {
  Items?: JellyfinBaseItem[];
  TotalRecordCount?: number;
  StartIndex?: number;
}

export interface JellyfinPlaybackInfoResponse {
  MediaSources?: JellyfinMediaSource[];
  PlaySessionId?: string;
  ErrorCode?: string;
}

export interface JellyfinSearchHint {
  ItemId?: string;
  Name?: string;
  Type?: string;
  SeriesName?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  PrimaryImageTag?: string;
  BackdropImageTag?: string;
  RunTimeTicks?: number;
  ProductionYear?: number;
}

export interface JellyfinSearchHintResult {
  SearchHints?: JellyfinSearchHint[];
  TotalRecordCount?: number;
}
