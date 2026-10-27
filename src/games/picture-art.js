const coats = {
  rabbit: { coat: '#FFF6DC', shade: '#E9D7AE', ear: '#E6B5AC' },
  cat: { coat: '#EDBD79', shade: '#D2A062', ear: '#E9A59A' },
  bear: { coat: '#B99173', shade: '#9E775D', ear: '#D9B99B' },
};

function head(character, x, y, asleep = false) {
  const c = coats[character];
  const ears = character === 'rabbit'
    ? `<ellipse cx="${x - 16}" cy="${y - 33}" rx="10" ry="28" transform="rotate(-9 ${x - 16} ${y - 33})" fill="${c.coat}"/><ellipse cx="${x + 16}" cy="${y - 33}" rx="10" ry="28" transform="rotate(9 ${x + 16} ${y - 33})" fill="${c.coat}"/><ellipse cx="${x - 16}" cy="${y - 34}" rx="4.5" ry="20" fill="${c.ear}"/><ellipse cx="${x + 16}" cy="${y - 34}" rx="4.5" ry="20" fill="${c.ear}"/>`
    : character === 'cat'
      ? `<path d="m${x - 32} ${y - 5} 1-33 27 19m9 0 27-19 1 34" fill="${c.coat}"/><path d="m${x - 25} ${y - 17} 1-12 10 7m28 6-1-13-10 7" fill="${c.ear}"/>`
      : `<circle cx="${x - 29}" cy="${y - 17}" r="15" fill="${c.coat}"/><circle cx="${x + 29}" cy="${y - 17}" r="15" fill="${c.coat}"/><circle cx="${x - 29}" cy="${y - 17}" r="8" fill="${c.ear}"/><circle cx="${x + 29}" cy="${y - 17}" r="8" fill="${c.ear}"/>`;
  return `${ears}<ellipse cx="${x}" cy="${y}" rx="37" ry="31" fill="${c.coat}"/>
    ${character === 'cat' ? `<path d="m${x - 6} ${y - 26} 3 9m8-9-1 9" stroke="${c.shade}" stroke-width="3" stroke-linecap="round"/>` : ''}
    <ellipse cx="${x}" cy="${y + 12}" rx="21" ry="13" fill="#FFF7E5" opacity=".85"/>
    ${asleep ? `<path d="m${x - 20} ${y}q6 6 12 0m16 0q6 6 12 0" stroke="#68513F" stroke-width="3" stroke-linecap="round" fill="none"/>` : `<ellipse cx="${x - 14}" cy="${y}" rx="3.6" ry="5" fill="#624C3C"/><ellipse cx="${x + 14}" cy="${y}" rx="3.6" ry="5" fill="#624C3C"/><circle cx="${x - 15}" cy="${y - 1}" r="1" fill="#fff"/><circle cx="${x + 13}" cy="${y - 1}" r="1" fill="#fff"/>`}
    <ellipse cx="${x - 25}" cy="${y + 9}" rx="7" ry="4" fill="#E7A696" opacity=".65"/><ellipse cx="${x + 25}" cy="${y + 9}" rx="7" ry="4" fill="#E7A696" opacity=".65"/>
    <path d="m${x - 5} ${y + 9}q5-5 10 0-1 6-5 6-4-1-5-6Z" fill="#BA8A76"/>
    <path d="M${x} ${y + 15}q-5 7-10 2m10-2q5 7 10 2" stroke="#9A755C" stroke-width="1.7" stroke-linecap="round" fill="none"/>
    ${character === 'cat' ? `<path d="m${x - 30} ${y + 10}-15-3m15 10-16 2m75-9 15-3m-15 10 16 2" stroke="${c.shade}" stroke-width="1.8" stroke-linecap="round"/>` : ''}`;
}

function apple(x, y, size = 1) {
  return `<g transform="translate(${x} ${y}) scale(${size})"><path d="M0-7c-15-8-21 13-9 24 4 4 7 3 9 1 3 2 6 3 10-1C22 6 15-15 0-7Z" fill="#EC8F79"/><path d="M0-8q-1-9 5-12" stroke="#8C9060" stroke-width="3" stroke-linecap="round"/><path d="M4-14q8-7 14-2-6 7-14 2" fill="#9BB977"/><path d="M-10-1q-4 6 0 11" stroke="#FFD9B1" stroke-width="3" stroke-linecap="round"/></g>`;
}

function plant() {
  return '<path d="m162 135 4 31h28l4-31Z" fill="#DDA389"/><path d="M160 132h40v9h-40Z" fill="#EAB79C"/><path d="M180 132v-36m0 21q-20 0-20-13 19-2 20 13m0 6q18-2 18-15-16 0-18 15" fill="#9CB880" stroke="#91AC74" stroke-width="2"/><g fill="#E8AFBA"><ellipse cx="180" cy="87" rx="7" ry="11"/><ellipse cx="180" cy="101" rx="7" ry="11"/><ellipse cx="173" cy="94" rx="11" ry="7"/><ellipse cx="187" cy="94" rx="11" ry="7"/></g><circle cx="180" cy="94" r="6" fill="#F1D37B"/>';
}

/** Original action illustrations: posture and props remain readable without motion. */
export function pictureActor(character, action) {
  const c = coats[character];
  let scene = '';
  if (action === 'run') {
    scene = `<g data-action-prop="run"><path d="M35 112h27m-34 17h23m-13 15h24" stroke="#B8BE9A" stroke-width="4" stroke-linecap="round"/><g class="picture-run-body"><path d="m99 133-29 25m48-22 31 23m-57-54-19 15m44-19 27-16" stroke="${c.coat}" stroke-width="15" stroke-linecap="round"/><ellipse cx="107" cy="115" rx="26" ry="34" transform="rotate(16 107 115)" fill="${c.coat}"/><ellipse cx="108" cy="119" rx="15" ry="22" fill="#FFF8E4" opacity=".7"/>${head(character, 111, 68)}<path d="m69 157-10 1m88 1 11 4" stroke="${c.shade}" stroke-width="9" stroke-linecap="round"/></g></g>`;
  } else if (action === 'eat') {
    scene = `<g data-action-prop="eat"><ellipse cx="105" cy="127" rx="34" ry="40" fill="${c.coat}"/><ellipse cx="105" cy="136" rx="22" ry="26" fill="#FFF8E4" opacity=".8"/><ellipse cx="79" cy="165" rx="20" ry="10" fill="${c.coat}"/><ellipse cx="132" cy="165" rx="20" ry="10" fill="${c.coat}"/>${head(character, 105, 67)}<path d="m77 109 2 30" stroke="${c.coat}" stroke-width="14" stroke-linecap="round"/><path d="M60 143h94q-4 29-47 29-42 0-47-29Z" fill="#B2CFCA"/><ellipse cx="107" cy="143" rx="47" ry="10" fill="#DCE8D9"/><ellipse cx="106" cy="143" rx="36" ry="5" fill="#8FAF9A"/><g class="picture-bite"><path d="m132 121 2-15" stroke="${c.coat}" stroke-width="14" stroke-linecap="round"/>${apple(138, 106, .7)}</g></g>`;
  } else if (action === 'sleep') {
    scene = `<g data-action-prop="sleep"><rect x="33" y="131" width="160" height="36" rx="16" fill="#DCC5A1"/><rect x="126" y="116" width="64" height="37" rx="14" fill="#FFF9E5"/><g class="picture-sleep-breath"><ellipse cx="91" cy="135" rx="47" ry="28" fill="${c.coat}"/>${head(character, 147, 110, true)}<path d="M38 130q42-21 90-2v35H38Z" fill="#A5C6C5"/><path d="M44 138q35-11 76-2" stroke="#D1E1D4" stroke-width="4" stroke-linecap="round"/><path d="m62 153 5-5 5 5m21-5 5-5 5 5" stroke="#D9E8D8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M64 73h15L64 88h15m9-43h20L88 65h20" stroke="#ADA4B7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  } else if (action === 'water') {
    scene = `<g data-action-prop="water"><ellipse cx="86" cy="128" rx="30" ry="39" fill="${c.coat}"/><ellipse cx="86" cy="133" rx="17" ry="26" fill="#FFF8E4" opacity=".75"/><ellipse cx="65" cy="166" rx="19" ry="10" fill="${c.coat}"/><ellipse cx="105" cy="166" rx="19" ry="10" fill="${c.coat}"/>${head(character, 87, 66)}${plant()}<path d="m109 116 18 8m-50-8 39 18" stroke="${c.coat}" stroke-width="13" stroke-linecap="round"/><g class="picture-watering-can"><path d="m117 115 31-3 5 26-30 4Z" fill="#A5C9CE"/><path d="m145 117 15 5 5-9 8 3-8 18-18-5" fill="#A5C9CE"/><path d="M123 117q-20-25-22-2 0 11 20 16" stroke="#91B6BF" stroke-width="6" fill="none"/><path d="m126 119 17-2" stroke="#DBE9E0" stroke-width="3" stroke-linecap="round"/></g><g class="picture-water-drop" fill="#8CB7D0"><path d="m169 123-3 9q4 5 6 0Z"/><path d="m176 129-3 8q4 5 6 0Z"/></g></g>`;
  } else {
    scene = `<g data-action-prop="paint"><path d="m150 79-14 91m35-91 23 91m-61-10h63" stroke="#C5A57B" stroke-width="7" stroke-linecap="round"/><rect x="132" y="67" width="64" height="83" rx="5" fill="#FFF9E6" stroke="#E5D6B8" stroke-width="3"/><path d="m143 127 15-18 20 24" stroke="#A4BC89" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="174" cy="87" r="9" fill="#F0CF73"/><path d="M142 100q9-10 18-3" stroke="#B5CFD4" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="80" cy="128" rx="29" ry="38" fill="${c.coat}"/><ellipse cx="80" cy="134" rx="17" ry="25" fill="#FFF8E4" opacity=".75"/><ellipse cx="59" cy="166" rx="19" ry="10" fill="${c.coat}"/><ellipse cx="100" cy="166" rx="19" ry="10" fill="${c.coat}"/>${head(character, 81, 66)}<path d="m56 116 6 29" stroke="${c.coat}" stroke-width="12" stroke-linecap="round"/><ellipse cx="61" cy="145" rx="23" ry="13" transform="rotate(-15 61 145)" fill="#E6CC9E"/><circle cx="47" cy="144" r="4" fill="#EFA08C"/><circle cx="59" cy="138" r="4" fill="#E7C56E"/><circle cx="70" cy="142" r="4" fill="#A5C5CE"/><g class="picture-brush"><path d="m105 118 20-13" stroke="${c.coat}" stroke-width="13" stroke-linecap="round"/><path d="m122 109 18-13" stroke="#B28F69" stroke-width="5" stroke-linecap="round"/><path d="m140 96 7-8q4 11-3 12Z" fill="#E69482"/></g></g>`;
  }
  return `<svg viewBox="0 0 220 190" fill="none" aria-hidden="true"><ellipse cx="112" cy="176" rx="78" ry="8" fill="#7F9571" opacity=".13"/>${scene}</svg>`;
}

/** The cue pictures a verb, never the identity or location of its answer. */
export function pictureCue(action) {
  const body = {
    run: '<g class="picture-cue-running"><circle cx="64" cy="25" r="10" fill="#B19BC6"/><path d="m61 43-14 26 18 12 14 19M48 69 27 94m31-45 22 11 13-11m-36-3-21 6" stroke="#A18BB9" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 63h15m-19 13h10m19 28H20" stroke="#D8CAA7" stroke-width="4" stroke-linecap="round"/></g>',
    eat: '<path d="M24 75h70q-4 24-35 24-31 0-35-24Z" fill="#A5C9C5"/><ellipse cx="59" cy="74" rx="35" ry="7" fill="#D8E5D3"/><g class="picture-cue-eating">'+apple(59,52,.85)+'<path d="m91 25-9 39m6-41 10 2m-7 7 8 2" stroke="#BDA88C" stroke-width="5" stroke-linecap="round"/></g>',
    sleep: '<path d="M21 81q4-18 18-18h43q16 0 18 18v16H21Z" fill="#A7C9C7"/><rect x="49" y="49" width="46" height="28" rx="12" fill="#FFF8DF" stroke="#E3D5B8" stroke-width="2"/><path d="M61 58q5 6 10 0m7 0q5 6 10 0" stroke="#AA947E" stroke-width="2.7" stroke-linecap="round"/><path d="M27 29h13L27 42h13m9-30h17L49 29h17" stroke="#A497B7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    water: '<path d="m68 77 4 25h27l4-25Z" fill="#DDA389"/><path d="M85 77V43m0 22q-15-1-14-11 14-1 14 11m0 7q15-2 15-13-13 0-15 13" fill="#9DB983" stroke="#91AC74" stroke-width="2"/><circle cx="85" cy="41" r="10" fill="#E9B1B9"/><circle cx="85" cy="41" r="4" fill="#F0D17A"/><path d="m23 40 28-3 5 26-27 5Z" fill="#A3C5D0"/><path d="m50 41 14 7 7-8 7 5-13 17-12-9" fill="#A3C5D0"/><path d="M29 43Q9 23 10 44q1 14 18 13" stroke="#A3C5D0" stroke-width="6" fill="none"/><g class="picture-cue-watering" fill="#8DB8D0"><path d="m76 56-3 9q4 5 6 0Z"/><path d="m83 64-3 9q4 5 6 0Z"/></g>',
    paint: '<rect x="29" y="29" width="63" height="69" rx="6" fill="#FFF9E5" stroke="#DFCFAD" stroke-width="3"/><path d="m42 81 15-18 22 21" stroke="#A4BD8C" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="75" cy="45" r="8" fill="#EDCE79"/><g class="picture-cue-painting"><path d="m17 62 37-40" stroke="#B89670" stroke-width="8" stroke-linecap="round"/><path d="m51 25 7-12q9 15-2 17Z" fill="#E89B8A"/></g>',
  }[action];
  return `<svg viewBox="0 0 120 120" fill="none" aria-hidden="true"><g data-action-prop="${action}">${body}</g></svg>`;
}

export const pictureGarden = '<svg class="picture-garden" viewBox="0 0 1000 330" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M0 0h1000v330H0Z" fill="#E6F0E5"/><circle cx="890" cy="58" r="33" fill="#F5D989" opacity=".8"/><path d="M0 217Q233 140 504 206t496-19v143H0Z" fill="#CFDCAD"/><path d="M0 256q227-53 498-4t502-9v87H0Z" fill="#DEE5BF"/><path d="M72 69q8-24 34-17 20-30 43-6 24-3 28 23Z" fill="#FFFEF0" opacity=".7"/><path d="M541 53q9-25 31-17 17-20 33-1 19-4 27 18Z" fill="#FFFEF0" opacity=".65"/><path d="M937 256v-91m0 45-21-22m21 9 18-17" stroke="#A8B486" stroke-width="6" stroke-linecap="round"/><ellipse cx="937" cy="152" rx="43" ry="53" fill="#B8CF9B"/><ellipse cx="916" cy="169" rx="31" ry="36" fill="#B8CF9B"/><ellipse cx="962" cy="171" rx="27" ry="32" fill="#B8CF9B"/><path d="m42 287 5-12 5 12m677 12 4-12 5 12m-270-8 4-11 5 11" stroke="#B5C590" stroke-width="3" stroke-linecap="round"/><g fill="#EFDEAA"><circle cx="31" cy="247" r="4"/><circle cx="39" cy="246" r="4"/><circle cx="35" cy="240" r="4"/><circle cx="35" cy="252" r="4"/><circle cx="782" cy="278" r="4"/><circle cx="790" cy="277" r="4"/><circle cx="786" cy="271" r="4"/><circle cx="786" cy="283" r="4"/></g></svg>';
