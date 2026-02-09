import { supabase } from '../../services/supabase'

export default function GameGrid({ guesses, targetCharacter }) {
  const properties = ['name','gender','game','occupation','species','location','damage_type','weapon_type','HP']
  const displayGuesses = [...guesses].reverse()

  const getCharacterImageUrl = (name) => {
    if (!name) return ''
    const fileName = `${name}.jpg`
    return supabase.storage.from('imagesofcharacters').getPublicUrl(fileName).data.publicUrl
  }

  return (
    <table className="game-grid">
      <thead>
        <tr>
          {properties.map(prop => (
            <th key={prop}>{prop.toUpperCase()}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayGuesses.map((guessObj, i) => (
          <tr key={guessObj?.character?.id || i}>
            {properties.map((prop, propIndex) => {
              const value = guessObj.character[prop]
              const bg = guessObj.hints[prop] // 'green', 'yellow', or 'red'
              let displayValue = value
              const textColor = bg === 'yellow' ? '#000' : undefined

              if (prop === 'name') {
                const imageUrl = getCharacterImageUrl(value)
                displayValue = (
                  <img
                    src={imageUrl}
                    alt={value}
                    loading="eager"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )
              }

              if (prop === 'HP' && targetCharacter && value != null) {
                const guessHp = Number(value)
                const targetHp = Number(targetCharacter.HP)

                if (!Number.isNaN(guessHp) && !Number.isNaN(targetHp) && guessHp !== targetHp) {
                  const arrow = guessHp < targetHp ? '↑' : '↓'
                  displayValue = `${value} ${arrow}`
                }
              }

              return (
                <td
                  key={prop}
                  className="guess-cell-animate"
                  style={{
                    backgroundColor: bg,
                    color: textColor,
                    animationDelay: `${propIndex * 320}ms`
                  }}
                >
                  <div className="guess-cell-inner">
                    {displayValue}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
