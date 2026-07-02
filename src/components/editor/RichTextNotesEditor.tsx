import Underline from '@tiptap/extension-underline'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { AutoDirectionParagraph } from './extensions/auto-direction-paragraph'
import { WordListItem } from './extensions/word-list-item'
import {
  createNotesContentFromHtml,
  type NotesContent,
} from './notes-content'
import { detectParagraphDirection } from './utils/detect-paragraph-direction'
import { convertEditorHtmlToPlainText } from './utils/html-to-plain-text'
import { sanitizePastedHtml } from './utils/sanitize-pasted-html'

import './rich-text-notes-editor.css'

type RichTextNotesEditorProps = {
  id?: string
  plainText: string
  html?: string
  onChange: (content: NotesContent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  defaultDirection?: 'rtl' | 'ltr'
}

type ToolbarButtonProps = {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

const NotesKeyboardShortcuts = Extension.create({
  name: 'notesKeyboardShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-u': () => this.editor.commands.toggleUnderline(),
      'Mod-z': () => this.editor.commands.undo(),
      'Mod-y': () => this.editor.commands.redo(),
      'Mod-Shift-z': () => this.editor.commands.redo(),
    }
  },
})

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function plainTextToEditorHtml(
  text: string,
  defaultDirection: 'rtl' | 'ltr' = 'rtl',
): string {
  if (!text) {
    return `<p dir="${defaultDirection}"></p>`
  }

  return text
    .split('\n')
    .map((line) => {
      const direction = line.trim()
        ? detectParagraphDirection(line, defaultDirection)
        : defaultDirection
      const align = direction === 'rtl' ? 'right' : 'left'

      if (!line) {
        return `<p dir="${direction}" style="text-align: ${align}"></p>`
      }

      return `<p dir="${direction}" style="text-align: ${align}">${escapeHtml(line)}</p>`
    })
    .join('')
}

function resolveInitialEditorHtml(
  plainText: string,
  html: string | undefined,
  defaultDirection: 'rtl' | 'ltr',
): string {
  if (html?.trim()) {
    return html
  }

  if (!plainText) {
    return `<p dir="${defaultDirection}"></p>`
  }

  return plainTextToEditorHtml(plainText, defaultDirection)
}

function buildNotesContentFromEditor(
  editor: NonNullable<ReturnType<typeof useEditor>>,
): NotesContent {
  return createNotesContentFromHtml(editor.getHTML())
}

function getActiveParagraphDirection(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  fallback: 'rtl' | 'ltr',
): 'rtl' | 'ltr' {
  const direction = editor.getAttributes('paragraph').dir

  return direction === 'ltr' ? 'ltr' : fallback
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      className="size-8 rounded-md"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function RichTextNotesEditor({
  id,
  plainText,
  html,
  onChange,
  placeholder = 'Enter notes...',
  disabled = false,
  className,
  defaultDirection = 'rtl',
}: RichTextNotesEditorProps) {
  const generatedId = useId()
  const editorId = id ?? generatedId
  const [activeDirection, setActiveDirection] = useState<'rtl' | 'ltr'>(
    defaultDirection,
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: false,
        paragraph: false,
        listItem: false,
        listKeymap: false,
      }),
      AutoDirectionParagraph,
      WordListItem,
      Underline,
      NotesKeyboardShortcuts,
    ],
    content: resolveInitialEditorHtml(plainText, html, defaultDirection),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: editorId,
        class:
          'min-h-24 w-full px-3 py-2 text-sm leading-normal text-foreground',
        'data-placeholder': placeholder,
        spellcheck: 'true',
      },
      transformPastedHTML: (pastedHtml) => sanitizePastedHtml(pastedHtml),
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(buildNotesContentFromEditor(currentEditor))
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      setActiveDirection(
        getActiveParagraphDirection(currentEditor, defaultDirection),
      )
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) {
      return
    }

    const currentHtml = editor.getHTML()
    const currentPlainText = convertEditorHtmlToPlainText(currentHtml)

    if (html?.trim() && html !== currentHtml) {
      editor.commands.setContent(html, { emitUpdate: false })
      return
    }

    if (!html?.trim() && plainText !== currentPlainText) {
      editor.commands.setContent(
        plainTextToEditorHtml(plainText, defaultDirection),
        { emitUpdate: false },
      )
    }
  }, [defaultDirection, editor, html, plainText])

  useEffect(() => {
    if (!editor) {
      return
    }

    setActiveDirection(getActiveParagraphDirection(editor, defaultDirection))
  }, [defaultDirection, editor])

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-24 w-full rounded-lg border border-input bg-background shadow-sm',
          className,
        )}
      />
    )
  }

  return (
    <div
      dir="rtl"
      className={cn(
        'rich-text-notes-editor w-full overflow-hidden rounded-lg border border-input bg-background shadow-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-border/70 bg-muted/20 p-1.5"
        role="toolbar"
        aria-label="Notes formatting"
      >
        <ToolbarButton
          label="Undo (Ctrl+Z)"
          disabled={disabled || !editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Redo (Ctrl+Y)"
          disabled={disabled || !editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border/80" aria-hidden="true" />

        <ToolbarButton
          label="Bold (Ctrl+B)"
          active={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Italic (Ctrl+I)"
          active={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Underline (Ctrl+U)"
          active={editor.isActive('underline')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border/80" aria-hidden="true" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border/80" aria-hidden="true" />

        <ToolbarButton
          label="Right to left"
          active={activeDirection === 'rtl'}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().updateAttributes('paragraph', { dir: 'rtl' }).run()
          }
        >
          <AlignRight className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Left to right"
          active={activeDirection === 'ltr'}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().updateAttributes('paragraph', { dir: 'ltr' }).run()
          }
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>

        <div className="mx-1 h-6 w-px bg-border/80" aria-hidden="true" />

        <ToolbarButton
          label="Clear formatting"
          disabled={disabled}
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetAllMarks()
              .clearNodes()
              .updateAttributes('paragraph', { dir: defaultDirection })
              .run()
          }
        >
          <Eraser className="size-4" />
        </ToolbarButton>
      </div>

      <div className="rich-text-notes-editor__body">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}