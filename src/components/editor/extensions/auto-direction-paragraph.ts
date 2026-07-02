import Paragraph from '@tiptap/extension-paragraph'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import {
  detectParagraphDirection,
  type ParagraphDirection,
} from '../utils/detect-paragraph-direction'

export const autoDirectionParagraphPluginKey = new PluginKey(
  'autoDirectionParagraph',
)

function applyDirectionAttributes(direction: ParagraphDirection) {
  return {
    dir: direction,
    style: direction === 'rtl' ? 'text-align: right' : 'text-align: left',
  }
}

export const AutoDirectionParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dir: {
        default: 'rtl',
        parseHTML: (element) =>
          element.getAttribute('dir') === 'ltr' ? 'ltr' : 'rtl',
        renderHTML: (attributes) =>
          applyDirectionAttributes(
            attributes.dir === 'ltr' ? 'ltr' : 'rtl',
          ),
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoDirectionParagraphPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (
            !transactions.some(
              (transaction) => transaction.docChanged || transaction.selectionSet,
            )
          ) {
            return null
          }

          const transaction = newState.tr
          let modified = false

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'paragraph') {
              return
            }

            const currentDirection =
              node.attrs.dir === 'ltr' ? 'ltr' : 'rtl'
            const text = node.textContent
            const nextDirection = text.trim()
              ? detectParagraphDirection(text, 'rtl')
              : currentDirection

            if (nextDirection === currentDirection) {
              return
            }

            transaction.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              dir: nextDirection,
            })
            modified = true
          })

          return modified ? transaction : null
        },
      }),
    ]
  },
})
