import type { Editor } from '@tiptap/core'
import ListItem from '@tiptap/extension-list-item'

function getActiveListItemNode(listItemTypeName: string, editor: Editor) {
  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)

    if (node.type.name === listItemTypeName) {
      return node
    }
  }

  return null
}

function isListItemEmpty(listItemTypeName: string, editor: Editor) {
  const listItem = getActiveListItemNode(listItemTypeName, editor)

  return listItem ? listItem.textContent.trim().length === 0 : false
}

export const WordListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const editor = this.editor

        if (!editor.isActive('listItem')) {
          return false
        }

        if (isListItemEmpty(this.name, editor)) {
          return editor.chain().focus().liftListItem(this.name).run()
        }

        return editor.chain().focus().splitListItem(this.name).run()
      },
      Backspace: () => {
        const editor = this.editor

        if (!editor.isActive('listItem')) {
          return false
        }

        const { empty, $from } = editor.state.selection

        if (!empty || $from.parentOffset !== 0) {
          return false
        }

        if (!isListItemEmpty(this.name, editor)) {
          return false
        }

        return editor.chain().focus().liftListItem(this.name).run()
      },
      'Shift-Enter': () => {
        if (!this.editor.isActive('listItem')) {
          return false
        }

        return this.editor.chain().focus().splitListItem(this.name).run()
      },
    }
  },
})
