type ReportMixedTextProps = {
  text: string
}

/** Isolates user-facing mixed-script text using semantic bidi markup. */
export function ReportMixedText({ text }: ReportMixedTextProps) {
  return <bdi dir="auto">{text}</bdi>
}

type ReportDirectionalTextProps = {
  text: string
  direction: 'ltr' | 'rtl'
}

/** Wraps text with a known direction (numbers, fixed-format dates). */
export function ReportDirectionalText({
  text,
  direction,
}: ReportDirectionalTextProps) {
  return <span dir={direction}>{text}</span>
}
