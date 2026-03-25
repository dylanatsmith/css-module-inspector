import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function activate(context: vscode.ExtensionContext) {
  const hover = vscode.languages.registerHoverProvider(
    [{language: 'typescriptreact'}, {language: 'javascriptreact'}],
    new CSSModuleHoverProvider(),
  )
  context.subscriptions.push(hover)
}

export function deactivate() {}

class CSSModuleHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const className = this.getClassNameAtPosition(document, position)
    if (!className) return

    const cssModulePath = this.findCSSModuleImport(document, className.importName)
    if (!cssModulePath) return

    const resolvedPath = this.resolveCSSPath(document, cssModulePath)
    if (!resolvedPath) return

    const cssContent = this.readCSSFile(resolvedPath)
    if (!cssContent) return

    const rules = this.extractClassRules(cssContent, className.className)
    if (!rules) return

    const markdown = new vscode.MarkdownString()
    markdown.appendCodeblock(rules, 'css')
    markdown.isTrusted = true

    return new vscode.Hover(markdown, className.range)
  }

  /**
   * Detects `styles.className` or `styles['class-name']` at the cursor position
   * and returns the import variable name, CSS class name, and range.
   */
  private getClassNameAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): {importName: string; className: string; range: vscode.Range} | undefined {
    const line = document.lineAt(position).text

    // Match styles.className (dot notation)
    const dotRegex = /(\w+)\.(\w+)/g
    let match
    while ((match = dotRegex.exec(line)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (position.character >= start && position.character <= end) {
        return {
          importName: match[1],
          className: match[2],
          range: new vscode.Range(position.line, start, position.line, end),
        }
      }
    }

    // Match styles['class-name'] (bracket notation)
    const bracketRegex = /(\w+)\[['"]([^'"]+)['"]\]/g
    while ((match = bracketRegex.exec(line)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (position.character >= start && position.character <= end) {
        return {
          importName: match[1],
          className: match[2],
          range: new vscode.Range(position.line, start, position.line, end),
        }
      }
    }

    return undefined
  }

  /**
   * Scans the document's import statements for a CSS module import whose
   * default import matches the given variable name.
   */
  private findCSSModuleImport(document: vscode.TextDocument, importName: string): string | undefined {
    const text = document.getText()

    // import styles from './Foo.module.css'
    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+\.module\.css)['"]/g
    let match
    while ((match = defaultImportRegex.exec(text)) !== null) {
      if (match[1] === importName) return match[2]
    }

    // import * as styles from './Foo.module.css'
    const namespaceImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+\.module\.css)['"]/g
    while ((match = namespaceImportRegex.exec(text)) !== null) {
      if (match[1] === importName) return match[2]
    }

    return undefined
  }

  private resolveCSSPath(document: vscode.TextDocument, importPath: string): string | undefined {
    const dir = path.dirname(document.uri.fsPath)
    const resolved = path.resolve(dir, importPath)
    if (fs.existsSync(resolved)) return resolved
    return undefined
  }

  private readCSSFile(filePath: string): string | undefined {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return undefined
    }
  }

  /**
   * Extracts the CSS rules for a given class name, handling nested blocks
   * (media queries, @supports, etc.) by brace-counting.
   */
  private extractClassRules(css: string, className: string): string | undefined {
    const results: string[] = []

    // Escape special regex chars in class name for safe matching
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const classRegex = new RegExp(`\\.${escaped}(?![\\w-])`)

    const lines = css.split('\n')

    for (let i = 0; i < lines.length; i++) {
      if (!classRegex.test(lines[i])) continue

      // Walk forward collecting the full rule block
      let braceDepth = 0
      let started = false
      const block: string[] = []

      // Check if this class selector is inside a parent block (e.g. @media)
      // by scanning backwards for an unclosed brace
      let parentBlock: string | undefined
      let parentDepth = 0
      for (let j = i - 1; j >= 0; j--) {
        for (const ch of lines[j]) {
          if (ch === '}') parentDepth++
          if (ch === '{') parentDepth--
        }
        if (parentDepth < 0) {
          parentBlock = lines[j].trim()
          break
        }
      }

      for (let j = i; j < lines.length; j++) {
        const line = lines[j]
        block.push(line)

        for (const ch of line) {
          if (ch === '{') {
            braceDepth++
            started = true
          }
          if (ch === '}') braceDepth--
        }

        if (started && braceDepth <= 0) break
      }

      if (block.length > 0) {
        if (parentBlock && /^@/.test(parentBlock)) {
          results.push(`${parentBlock}\n${block.join('\n')}\n}`)
        } else {
          results.push(block.join('\n'))
        }
      }
    }

    return results.length > 0 ? results.join('\n\n') : undefined
  }
}
