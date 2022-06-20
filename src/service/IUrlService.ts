export type UrlParams = string | Record<string, string | ReadonlyArray<string>> | Iterable<[string, string]> | ReadonlyArray<[string, string]>;

export interface IUrlService {
    getUrl(url: string, params?: UrlParams): string;
    resolveUrlPath(path: string): string;
}
