#!/bin/sh
# Se ejecuta en cada arranque del contenedor, antes del daemon (mecanismo /container-init.d de Kubo).
# Aísla el nodo de la red pública de IPFS: solo hablará con nodos que tengan la misma clave de enjambre.
set -e

# Sin nodos de arranque públicos ni descarga automática de la lista de bootstrap
ipfs bootstrap rm --all >/dev/null
ipfs config --json AutoConf.Enabled false

# Sin descubrimiento de nodos en la red local ni servicios de NAT y relay públicos
ipfs config --json Discovery.MDNS.Enabled false
ipfs config --json Swarm.RelayClient.Enabled false
ipfs config --json Swarm.RelayService.Enabled false
ipfs config AutoNAT.ServiceMode disabled

# No anunciar contenido a la red (DHT) ni usar enrutadores HTTP públicos
ipfs config Routing.Type none
ipfs config --json Provide.Enabled false

# Opciones de la red pública que no aplican a una red privada (evitan errores al arrancar)
ipfs config --json AutoTLS.Enabled false
ipfs config --json Swarm.Transports.Network.Websocket false
ipfs config --json DNS.Resolvers '{}'
ipfs config --json Routing.DelegatedRouters '[]'
ipfs config --json Ipns.DelegatedPublishers '[]'
