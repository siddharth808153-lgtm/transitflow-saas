import { useState } from 'react'
import classNames from '@/utils/classNames'
import { motion } from 'framer-motion'

const CardStack = ({ items, offset, scaleFactor, className }) => {
    const CARD_OFFSET = offset || 10
    const SCALE_FACTOR = scaleFactor || 0.06
    const [cards, setCards] = useState(items)

    const flip = () => {
        setCards((prevCards) => {
            const newArray = [...prevCards]
            newArray.unshift(newArray.pop())
            return newArray
        })
    }

    return (
        <div
            className={classNames('h-60 w-60 md:h-60 md:w-[420px]', className)}
        >
            {cards.map((card, index) => {
                return (
                    <motion.div
                        key={card.id}
                        className="cursor-pointer absolute  h-60 w-60 md:h-70 md:w-[420px] rounded-2xl p-3 shadow-xl border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-500  shadow-black/[0.1] dark:shadow-white/[0.05] flex flex-col justify-between"
                        style={{
                            transformOrigin: 'top center',
                        }}
                        animate={{
                            top: index * -CARD_OFFSET,
                            scale: 1 - index * SCALE_FACTOR,
                            zIndex: cards.length - index,
                        }}
                        onClick={() => flip()}
                    >
                        {card.content}
                    </motion.div>
                )
            })}
        </div>
    )
}

export default CardStack
