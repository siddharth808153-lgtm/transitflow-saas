import { Prism } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const SyntaxHighlighter = (props) => {
    const { children, ...rest } = props

    return (
        <Prism style={oneDark} className="not-prose text-sm" {...rest}>
            {children}
        </Prism>
    )
}

export default SyntaxHighlighter
