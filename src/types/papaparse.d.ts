declare module 'papaparse' {
  export interface ParseConfig<T = Record<string, string>> {
    header?: boolean
    skipEmptyLines?: boolean | 'greedy'
    dynamicTyping?: boolean
    complete?: (results: ParseResult<T>) => void
    error?: (error: Error) => void
  }

  export interface ParseMeta {
    delimiter: string
    linebreak: string
    aborted: boolean
    fields?: string[]
    truncated: boolean
  }

  export interface ParseError {
    type: string
    code: string
    message: string
    row: number
  }

  export interface ParseResult<T = Record<string, string>> {
    data: T[]
    errors: ParseError[]
    meta: ParseMeta
  }

  export function parse<T = Record<string, string>>(
    input: string | File,
    config?: ParseConfig<T>
  ): ParseResult<T>
}
