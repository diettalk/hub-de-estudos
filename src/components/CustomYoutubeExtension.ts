import { Node, nodeInputRule, mergeAttributes } from '@tiptap/core'

// --- Esta é uma cópia da extensão oficial @tiptap/extension-youtube ---
// --- com uma correção crucial para evitar o crash com URLs nulas. ---

export interface YoutubeOptions {
  addPasteHandler: boolean,
  allowFullscreen: boolean,
  autoplay: boolean,
  ccLanguage?: string,
  ccLoadPolicy?: boolean,
  controls: boolean,
  disableKBcontrols: boolean,
  enableIFrameApi: boolean,
  endTime: number,
  height: number,
  interfaceLanguage?: string,
  ivLoadPolicy: number,
  loop: boolean,
  modestBranding: boolean,
  nocookie: boolean,
  origin: string,
  playlist: string,
  progressBarColor?: string,
  start: number,
  width: number,
  HTMLAttributes: Record<string, any>,
}

type SetYoutubeVideoOptions = {
  src: string,
  width?: number,
  height?: number,
  start?: number,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      setYoutubeVideo: (options: SetYoutubeVideoOptions) => ReturnType,
    }
  }
}

export const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.|music\.)?(youtube\.com|youtu\.be)(?!\/channel\/)(?!\/user\/)\/(?!shorts\/)(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%?]{11})/
export const YOUTUBE_REGEX_GLOBAL = /^(https?:\/\/)?(www\.|music\.)?(youtube\.com|youtu\.be)(?!\/channel\/)(?!\/user\/)\/(?!shorts\/)(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%?]{11})/g

const isValidYoutubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    return YOUTUBE_REGEX.test(url);
}

function getEmbedUrlFromYoutubeUrl(url: string | null, options: YoutubeOptions) {
    if (!url || !isValidYoutubeUrl(url)) {
        return null;
    }
    
    const videoId = url.match(YOUTUBE_REGEX)?.[6];
    if (!videoId) return null;

    let finalUrl = `https://www.youtube.com${options.nocookie ? '-nocookie' : ''}.com/embed/${videoId}?`;
    
    finalUrl += `autoplay=${options.autoplay ? 1 : 0}&`;
    finalUrl += `controls=${options.controls ? 1 : 0}&`;
    finalUrl += `start=${options.start || 0}&`;
    finalUrl += `end=${options.endTime || 0}&`;
    finalUrl += `loop=${options.loop ? 1 : 0}&`;
    finalUrl += `modestbranding=${options.modestBranding ? 1 : 0}&`;
    finalUrl += `disablekb=${options.disableKBcontrols ? 1 : 0}&`;
    finalUrl += `enablejsapi=${options.enableIFrameApi ? 1 : 0}&`;
    finalUrl += `iv_load_policy=${options.ivLoadPolicy || 0}&`;

    return finalUrl;
}

export const CustomYoutubeExtension = Node.create<YoutubeOptions>({
  name: 'youtube',

  addOptions() {
    return {
      addPasteHandler: true,
      allowFullscreen: true,
      autoplay: false,
      ccLanguage: undefined,
      ccLoadPolicy: undefined,
      controls: true,
      disableKBcontrols: false,
      enableIFrameApi: false,
      endTime: 0,
      height: 480,
      interfaceLanguage: undefined,
      ivLoadPolicy: 0,
      loop: false,
      modestBranding: true,
      nocookie: false,
      origin: '',
      playlist: '',
      progressBarColor: undefined,
      start: 0,
      width: 640,
      HTMLAttributes: {},
    }
  },

  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: this.options.width },
      height: { default: this.options.height },
      start: { default: 0 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-youtube-video]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const embedUrl = getEmbedUrlFromYoutubeUrl(HTMLAttributes.src, this.options);

    if (!embedUrl) {
        return ['div', { 'data-youtube-video-invalid': '' }];
    }

    return [
      'div', { 'data-youtube-video': '' },
      [
        'iframe',
        mergeAttributes(this.options.HTMLAttributes, {
            width: this.options.width,
            height: this.options.height,
            src: embedUrl,
            frameborder: 0,
            allowfullscreen: this.options.allowFullscreen,
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        }, HTMLAttributes),
      ],
    ]
  },

  addCommands() {
    return {
      setYoutubeVideo: (options: SetYoutubeVideoOptions) => ({ commands }) => {
        if (!isValidYoutubeUrl(options.src)) return false;
        return commands.insertContent({ type: this.name, attrs: options });
      },
    }
  },

  addInputRules() {
    return [
        nodeInputRule({
            find: YOUTUBE_REGEX_GLOBAL,
            type: this.type,
            getAttributes: match => ({ src: match[0] }),
        }),
    ]
  }
})

