FROM debian:sid
LABEL maintainer "gordonh@member.fsf.org"
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -yq upgrade
RUN DEBIAN_FRONTEND=noninteractive apt-get -yq install wget apt-transport-https gnupg curl libssl-dev git python build-essential nodejs npm
RUN git clone https://github.com/kadence/kadence /root/kadence; \
    git fetch --tags; \
    git checkout $(git describe --tags `git rev-list --tags --max-count=1`); \
    cd /root/kadence && npm install --unsafe-perm --production
VOLUME ["/root/.config/kadence"]
EXPOSE 5274
EXPOSE 5275
ENV kadence_NodeListenAddress="0.0.0.0"
ENV kadence_ControlSockEnabled="0"
ENV kadence_ControlPortEnabled="1"
ENTRYPOINT ["node", "/root/kadence/bin/kadence.js"]
CMD []
