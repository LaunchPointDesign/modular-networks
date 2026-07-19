# Design Scenarios Case Study Plan

## Goal

Turn the four Design scenarios cards into richer case studies that connect directly to Maurice Burt's public GitHub network-design repositories. Each card should explain the project context, design decisions, validation work, and provide a direct repository link.

## Source Strategy

Use GitHub as a planning and content source, then render curated static content in the site.

- Repository list source: `https://api.github.com/users/MauriceBurt/repos?per_page=100`
- Repository detail source: `https://api.github.com/repos/MauriceBurt/{repo}`
- README source: `https://raw.githubusercontent.com/MauriceBurt/{repo}/main/README.md`
- Public repo links should point to the normal GitHub pages, not API endpoints.

The site should not call the GitHub API at runtime. This project is a static site, so static case-study content avoids rate limits, loading states, API failures, and GitHub Pages compatibility issues.

## Case Study Mapping

| Site scenario | GitHub repository | Content focus |
| --- | --- | --- |
| Theater Production Network | `MauriceBurt/Spark-Of-Life-Theatre-Production` | Temporary theater production network, guest portal access, production VLANs, ACLs, IoT isolation, stage manager control network, validation testing |
| Gaming Expo Infrastructure | `MauriceBurt/MadXGames_Gaming_Expo` | High-density esports venue, segmented wireless, vendors, VIP competitors, security operations, tournament systems, AV infrastructure, port security |
| Retail and Small Business Network | `MauriceBurt/Guest_Wifi_Segmentation` | Baseline small-business guest Wi-Fi isolation, internal versus guest VLANs, router-on-a-stick, NAT, ACL enforcement, ICMP validation |
| Business-Specific Network Planning | `MauriceBurt/MoCo-Family-Center-Network-Design` | Medical-practice network, department VLANs, guest isolation, controlled inter-VLAN communication, access-layer physical security |

Related expansion repo:

- `MauriceBurt/MoCo_VLAN_Segmentation` can support future copy for a more advanced multi-department small-business scenario.

## UI/UX Plan

Keep the existing section structure and visual language. The updated cards should stay scannable and practical:

- Lead with a short case-study summary.
- Use compact technology chips for the implementation themes.
- Use labeled rows for `Context`, `Design`, and `Outcome`.
- Add one clear repository CTA per card.
- Preserve the existing responsive two-column grid on desktop and single-column layout on mobile.
- Keep links keyboard accessible with visible focus styles and minimum 44px touch targets.

## Implementation Notes

Primary files:

- `index.html`: update the `#solutions` section copy and card content.
- `assets/css/styles.css`: add scoped styling for summaries, chips, and repository CTAs.

Do not introduce runtime JavaScript for GitHub data. If the site later needs automatic updates, add a build-time fetch script that stores reviewed GitHub metadata in a local JSON file before deployment.

## Verification

- Confirm all four repository links open the correct GitHub pages.
- Run the static site locally and inspect the Design scenarios section on desktop and mobile widths.
- Check keyboard tab order and focus visibility for each repository link.
- Confirm no text overflows inside cards, chips, or CTA buttons.
- Confirm no console errors were introduced.

## Open Notes

The main `Modular-Networks` README references additional designs such as ransomware failover and stadium blackout recovery. They were not used in the four-card implementation because the current page has four scenario slots and the selected repositories map directly to the existing scenario themes.
