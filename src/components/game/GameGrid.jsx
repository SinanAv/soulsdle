import getStoragePublicUrl from '../../utils/getStoragePublicUrl'

const PROPERTIES = ['name', 'gender', 'game', 'occupation', 'species', 'location', 'damage_type', 'weapon_type', 'HP']

const getCharacterImageUrl = (name) => {
  return getStoragePublicUrl('imagesofcharacters', name)
}

const getHpDisplayValue = (value, targetCharacter) => {
  if (!targetCharacter || value == null) return value

  const guessHp = Number(value)
  const targetHp = Number(targetCharacter.HP)
  if (Number.isNaN(guessHp) || Number.isNaN(targetHp) || guessHp === targetHp) return value

  const arrow = guessHp < targetHp ? '↑' : '↓'
  return `${value} ${arrow}`
}

export default function GameGrid({ guesses, targetCharacter }) {
  const displayGuesses = [...guesses].reverse()

  return (
    <table className="game-grid">
      <thead>
        <tr>
          {PROPERTIES.map((property) => (
            <th key={property}>{property.toUpperCase()}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {displayGuesses.map((guessObj, i) => (
          <tr key={guessObj?.character?.id || i}>
            {PROPERTIES.map((property, propertyIndex) => {
              const value = guessObj.character[property]
              const bg = guessObj?.clues?.[property]
              const textColor = bg === 'yellow' ? '#000' : undefined

              let displayValue = value
              if (property === 'name') {
                displayValue = (
                  <img
                    src={getCharacterImageUrl(value)}
                    alt={value}
                    loading="eager"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )
              }

              if (property === 'HP') {
                displayValue = getHpDisplayValue(value, targetCharacter)
              }

              return (
                <td
                  key={property}
                  className="guess-cell-animate"
                  style={{
                    backgroundColor: bg,
                    color: textColor,
                    animationDelay: `${propertyIndex * 320}ms`
                  }}
                >
                  <div className="guess-cell-inner">{displayValue}</div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
