import signal
import logging
import os
import tornado.ioloop
import tornado.web
import tornado.options
import tornado.httpserver
from vidChatApp import HomePage, PageStream, Chat, ChatRoomSocket


class RSVPVidChat(tornado.web.Application):
    is_closing = False

    def signal_handler(self, signum, frame):
        logging.info('exiting...')
        self.is_closing = True

    def try_exit(self):
        if self.is_closing:
            # clean up here
            tornado.ioloop.IOLoop.instance().stop()
            logging.info('exit success')


def buildHandlers():
    return [
        (r"/", HomePage),
        (r"/page", PageStream),
        (r"/chat", Chat),
        (r"/chatsocket", ChatRoomSocket)
    ]


def makeApp():
    settings = {
        "debug": True,
        "static_path": os.path.join(os.path.dirname(__file__), "sources")
    }
    return RSVPVidChat(handlers=buildHandlers(), **settings)


if __name__ == "__main__":
    application = makeApp()
    # http_server = tornado.httpserver.HTTPServer(application, ssl_options={"certfile": os.path.join("certs","fullchain1.pem"),"keyfile": os.path.join("certs", "privkey1.pem"),})
    tornado.options.parse_command_line()
    signal.signal(signal.SIGINT, application.signal_handler)
    # http_server.listen(443)
    application.listen(8888)
    tornado.ioloop.PeriodicCallback(application.try_exit, 100).start()
    tornado.ioloop.IOLoop.instance().start()
