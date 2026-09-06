Déconnexion au refresh : oui, c'est voulu — c'est documenté noir sur blanc dans lib/token-store.ts :

Jetons en mémoire uniquement (module JS, pas de localStorage/cookie) — choix assumé de F2-web-planner.md §9 : le durcissement (cookies httpOnly) est un incrément ultérieur. Conséquence directe : un rechargement de page perd la session, il n'y a rien à restaurer par conception.

Le raisonnement : stocker le token en localStorage l'expose à n'importe quel XSS (lisible par du JS injecté) ; le garder uniquement en mémoire JS élimine cette classe de risque, au prix de perdre la session au refresh. Le vrai fix propre (cookies httpOnly, invisibles au JS) est explicitement noté comme un incrément futur, pas encore fait. Donc : pas un bug, un compromis sécurité assumé et documenté — mais pas encore l'état final voulu.

--------------------------------------------------------------




