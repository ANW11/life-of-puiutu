# Border War — art prompts

Save each image as a PNG with a **transparent background** in this folder (`rts/art/`), using the
file name shown. The game picks it up on the next start and stops drawing that thing itself.
Anything you don't make keeps the drawn-in-code look, so you can do them a few at a time.

Add this style line to the end of every prompt, so they all match the game's art:

> **Style:** detailed 16-bit pixel art, cozy fantasy, top-down three-quarter view (camera high, looking down at about 45°, like Warcraft III or Stardew Valley), warm soft lighting from the top-left, crisp pixel edges, single isolated object centred on a fully transparent background, no ground tile, no text, no border, no drop shadow.

## Buildings — 512×512, the building sits on the bottom edge and fills most of the width

### The Clowder (cats): warm timber, orange thatch, cosy and well cared for
| File | Prompt |
|---|---|
| `den.png` | A large cosy cat town hall: a two-storey timber longhouse with an orange thatched roof shaped like a pair of cat ears, round paw-print windows glowing warm, a stone chimney with smoke, fish drying on a rack by the door, small blue banners with a white paw. |
| `cottage.png` | A small round cat cottage with an orange thatched roof, a round door, a little garden of catnip and a sleeping basket by the wall. |
| `yard.png` | A cat training yard: a wooden barracks shed with an orange roof, a fenced sparring ring with straw training dummies shaped like mice, a rack of small wooden swords and shields. |
| `scratch.png` | A tall scratching-post forge: a thick wooden post wrapped in rope, a platform on top with a small anvil, claw marks on the wood, tools and a whetstone at its base. |
| `pride.png` | Pride Rock: a big sandstone rock formation with a flat ledge on top, a golden lion banner, a cave entrance at its base with warm light inside. |
| `cattower.png` | A slim wooden watchtower with an orange conical roof, a lookout platform and a basket of hairballs ready to throw. |

### The Swarm (rats): scrap, rust, dark wood, red cloth — clever and messy
| File | Prompt |
|---|---|
| `burrow.png` | A large rat town hall: a huge burrow mound with a tunnel mouth, built over with scavenged planks, rusty sheet metal and a cracked teapot chimney, red cloth banners with a rat skull, junk piled around. |
| `nest.png` | A small rat nest: a shack made from an old crate and a tin can roof, straw and rags spilling out. |
| `warren.png` | A rat barracks: a ramshackle wooden hall patched with scrap metal, a muddy training pit with a spiky fence, crude red war banners. |
| `junkforge.png` | A junk forge: a rusty furnace made from an old stove and pipes, glowing orange, a pile of bent forks and nails, a grinding wheel. |
| `pit.png` | A lobster pit: a sunken pool of dark water ringed with stones and glowing blue crystals, chains and a rusty cage gate. |
| `spiketower.png` | A crooked defensive tower made of planks and scrap with sharpened spikes and bent nails sticking out, a red rag flag on top. |

### Neutral
| File | Prompt |
|---|---|
| `exchange.png` | The Pig Exchange: a fancy little market hall of pink stucco with a gold-trimmed awning, a big gold coin sign over the door, crates and sacks of goods, a ledger desk out front. |
| `scaffold.png` | Generic wooden construction scaffolding with ladders and planks, empty in the middle (it is drawn over a building while it is being built). |

## Workers — 512×512, side view, facing RIGHT, full body, feet on the bottom edge
Units are drawn from the side (like the other army sprites), not from above. For these, replace
"top-down three-quarter view" in the style line with **"side view, facing right"**, and keep the
same character in every frame (make walk0 first, then ask for the others "same character, next frame").

| File | Prompt |
|---|---|
| `courier_walk0.png` … `courier_walk3.png` | A small orange-and-white tabby cat worker walking on all fours, wearing a little leather apron and a straw hat, a fishing basket on its back. Four frames of a walk cycle. |
| `courier_work.png` | The same cat worker standing on its hind legs, swinging a small wood axe. |
| `courier_carry.png` | The same cat worker walking, carrying a big fish in its mouth. |
| `scavenger_walk0.png` … `scavenger_walk3.png` | A scruffy brown rat worker scurrying, wearing a patched sack as a cloak and a dented tin-can helmet, a bundle of sticks on its back. Four frames of a walk cycle. |
| `scavenger_work.png` | The same rat worker standing up, hacking with a rusty hatchet. |
| `scavenger_carry.png` | The same rat worker running with a fish slung over its shoulder. |

## Nature
| File | Size | Prompt |
|---|---|---|
| `tree_pine.png` | 256×384 | A single tall dark-green pine tree with a short brown trunk, seen from the three-quarter view. |
| `tree_pine2.png` | 256×384 | A second pine tree, slightly different shape and a bit lighter green. |
| `tree_oak.png` | 256×384 | A single round leafy oak tree, lush green crown, short trunk. |
| `tree_oak2.png` | 256×384 | A second leafy tree, a little smaller, with a few lighter leaves. |
| `rock.png` | 256×256 | A single grey boulder with some moss. |
| `rock2.png` | 256×256 | A small cluster of two or three grey rocks. |
| `stump.png` | 256×256 | A cut tree stump with visible rings and a few wood chips. |
| `pond.png` | 384×384 | A small round fishing pond seen from above at three-quarter view: clear blue water, a sandy rim, two lily pads, a fish just under the surface. |

## Ground textures — 256×256, these must tile seamlessly, flat top-down, *no* transparency
For these, replace the style line with: *"seamless tileable texture, flat top-down, 16-bit pixel art, no objects, no shadows, even lighting"*.

| File | Prompt |
|---|---|
| `grass.png` | Short meadow grass, mid green with a few lighter and darker blades and tiny scattered flowers. |
| `dirt.png` | A packed dirt path, warm light brown with small pebbles. |
| `water.png` | Calm lake water, medium blue with gentle light ripples. |

## Items — 128×128 icons
| File | Prompt |
|---|---|
| `item_potion.png` | A small glass bottle holding a pink salmon-coloured healing potion with a fish-shaped cork. |
| `item_mana.png` | A small bottle of glowing pale-blue moon milk. |
| `item_claws.png` | A pair of sharp golden metal claws on a leather strap. |
| `item_collar.png` | A sturdy iron cat collar with rivets. |
| `item_bell.png` | A small silver bell on a green ribbon. |
| `item_heart.png` | A glowing ruby heart pendant shaped like a lion's head. |
| `item_scroll.png` | A rolled parchment scroll tied with a red ribbon. |
| `item_mouse.png` | A small cat toy mouse wrapped in bright lime-green yarn, round pink felt ears, black bead eyes, a long thin yarn tail. |
| `item_carrot.png` | A cat toy carrot made of orange twisted rope wound around a cone, crumpled green paper leaves on top. |

## Tips
- Make the buildings of one faction in a single session, one after another, so they share a palette.
- If the generator adds a background, remove it (most tools have "remove background"). A white or checkered background shows up as a box in the game.
- Keep the building at the bottom of the canvas: the game lines up the bottom of the picture with the bottom of the building's plot.
