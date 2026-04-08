'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface TaskEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TaskEditor({ content, onChange, placeholder }: TaskEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-zinc dark:prose-invert max-w-none min-h-[80px] px-3 py-2 text-sm text-text-primary focus:outline-none',
      },
    },
    onBlur: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== content) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className="rounded-lg border border-border bg-bg-primary overflow-hidden">
      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-0.5 border-b border-border px-2 py-1">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            &bull;
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            &ldquo;
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
      {!content && !editor?.isFocused && (
        <div className="absolute px-3 py-2 text-sm text-text-muted pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
      }`}
    >
      {children}
    </button>
  );
}
