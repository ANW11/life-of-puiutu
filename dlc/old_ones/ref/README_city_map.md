# How city_of_fangs.png is built (run from the repo root, in order)
1. statue.py        right sphinx = mirror of the left one (from city_of_fangs_v1.png, the stitched halves)
2. rebuild_city.py  plain floor (no mosaics), avenue border back, tent back, no banner
3. break_fang.py    the right sphinx's front fang broken in half
4. spike_fix.py     the hanging spike behind the right sphinx ends above its back
Walk mask: make_city_mask.py
5. pig_seals.py    the bank symbol on the tent and crates becomes the pig seal
