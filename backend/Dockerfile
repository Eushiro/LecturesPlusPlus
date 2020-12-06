FROM nikolaik/python-nodejs:latest
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y git
RUN apt-get install -y ffmpeg
RUN pip3 install git+https://github.com/agermanidis/autosub.git
CMD ["npm", "start"]