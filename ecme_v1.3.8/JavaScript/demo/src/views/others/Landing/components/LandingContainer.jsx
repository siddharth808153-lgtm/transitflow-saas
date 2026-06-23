import { forwardRef } from 'react'
import classNames from '@/utils/classNames'

const Container = forwardRef((props, ref) => {
    const { className, children, asElement: Component = 'div', ...rest } = props

    return (
        <Component
            ref={ref}
            className={classNames('max-w-7xl mx-auto px-4', className)}
            {...rest}
        >
            {children}
        </Component>
    )
})

Container.displayName = 'Container'

export default Container
